const { createHash, randomBytes, timingSafeEqual } = require('node:crypto');

const DELTA_BLUE = 0x071D49;
const hashState = (state) => createHash('sha256').update(state).digest('hex');
const base64UrlHash = (value) => createHash('sha256').update(value).digest('base64url');
const formatAuthenticatedNickname = (rpName, robloxUsername) => `${rpName} (@${robloxUsername})`;

function validateOAuthRedirectUri(value) {
  if (!value) return null;
  let redirect;
  try {
    redirect = new URL(value);
  } catch {
    return 'ROBLOX_OAUTH_REDIRECT_URI is not a valid URL';
  }
  const localDevelopment = ['localhost', '127.0.0.1'].includes(redirect.hostname);
  if (redirect.protocol !== 'https:' && !localDevelopment) {
    return 'ROBLOX_OAUTH_REDIRECT_URI must use HTTPS';
  }
  if (redirect.hostname === 'discord.com' || redirect.hostname.endsWith('.discord.com')) {
    return 'ROBLOX_OAUTH_REDIRECT_URI must be your bot website, not a Discord channel URL';
  }
  if (redirect.pathname !== '/auth/roblox/callback' || redirect.search || redirect.hash) {
    return 'ROBLOX_OAUTH_REDIRECT_URI must end exactly with /auth/roblox/callback';
  }
  return null;
}

function html(response, status, title, message) {
  response.writeHead(status, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
  response.end(`<!doctype html><html><head><meta name="viewport" content="width=device-width"><title>${title}</title></head><body style="font-family:system-ui;background:#071D49;color:#fff;padding:3rem"><h1>${title}</h1><p>${message}</p><p>You may close this page and return to Discord.</p></body></html>`);
}

function validateRpName(firstName, lastInitial, confirmation) {
  const first = firstName.trim();
  const suppliedInitial = lastInitial.trim();
  if (!/^[A-Za-z][A-Za-z'-]{1,19}$/.test(first) || !/^[A-Za-z]\.$/.test(suppliedInitial)) {
    throw new Error('Use an RP first name and one last-name initial with a period, such as Jordan S.');
  }
  const initial = suppliedInitial[0].toUpperCase();
  if (confirmation.trim().toUpperCase() !== 'CONFIRMED') {
    throw new Error('You must confirm that the RP name is not your real name.');
  }
  return `${first} ${initial}.`;
}

function createAuthenticationService({ config, database, roblox, roleSync, client, getGuildConfig = async () => config, fetchImpl = global.fetch }) {
  function configurationIssues() {
    const redirectIssue = validateOAuthRedirectUri(config.robloxOauthRedirectUri);
    return [
      !database.configured && 'DATABASE_URL',
      !config.robloxOauthClientId && 'ROBLOX_OAUTH_CLIENT_ID',
      !config.robloxOauthClientSecret && 'ROBLOX_OAUTH_CLIENT_SECRET',
      !config.robloxOauthRedirectUri && 'ROBLOX_OAUTH_REDIRECT_URI',
      redirectIssue,
    ].filter(Boolean);
  }

  function configured() {
    return configurationIssues().length === 0;
  }

  async function begin(discordUserId, guildId, username, rpName) {
    const issues = configurationIssues();
    if (issues.length) {
      throw new Error(`Authentication setup is not ready: ${issues.join(', ')}. Run \`/authentication-config status\` after updating Render.`);
    }
    if (!/^[A-Za-z][A-Za-z'-]{1,19} [A-Z]\.$/.test(rpName || '')) {
      throw new Error('Choose a valid RP first name and last initial before authentication.');
    }
    const installedInOneGuild = client.guilds.cache?.size === 1;
    if (!installedInOneGuild && config.guildId && String(guildId) !== String(config.guildId)) {
      throw new Error('Use authentication in the configured Delta Air Lines server');
    }
    const existing = await database.getByDiscordId(discordUserId);
    if (existing) throw new Error('Your Discord account is already authenticated. Contact leadership to unlink it.');
    const user = await roblox.getUserByUsername(username);
    if (formatAuthenticatedNickname(rpName, user.name).length > 32) {
      throw new Error('That RP name is too long when combined with your Roblox username. Choose a shorter RP first name.');
    }
    const linked = await database.getByRobloxId(user.id);
    if (linked) throw new Error('That Roblox account is already linked. Contact leadership if this is incorrect.');

    const state = randomBytes(32).toString('base64url');
    const codeVerifier = randomBytes(48).toString('base64url');
    const effectiveConfig = await getGuildConfig(guildId);
    if (!effectiveConfig.authenticatedRoleId || !effectiveConfig.unauthenticatedRoleId || !effectiveConfig.robloxGroupId) {
      throw new Error('Run `/authentication-config set` before members authenticate.');
    }
    await database.createPending({ stateHash: hashState(state), discordUserId, guildId, robloxUserId: user.id, codeVerifier, rpName });
    const url = new URL('https://apis.roblox.com/oauth/v1/authorize');
    url.search = new URLSearchParams({
      client_id: config.robloxOauthClientId,
      redirect_uri: config.robloxOauthRedirectUri,
      response_type: 'code',
      scope: 'openid profile',
      state,
      code_challenge: base64UrlHash(codeVerifier),
      code_challenge_method: 'S256',
    });
    return {
      user,
      payload: {
        embeds: [{ color: DELTA_BLUE, title: '🔐 Authenticate Roblox Ownership', description: `Continue to Roblox to prove that you own **${user.name}**. This link expires in 10 minutes.` }],
        components: [{ type: 1, components: [{ type: 2, style: 5, label: 'Continue with Roblox', url: url.toString() }] }],
      },
    };
  }

  async function exchangeCode(code, codeVerifier) {
    const response = await fetchImpl('https://apis.roblox.com/oauth/v1/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'authorization_code', code, client_id: config.robloxOauthClientId, client_secret: config.robloxOauthClientSecret, redirect_uri: config.robloxOauthRedirectUri, code_verifier: codeVerifier }),
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) throw new Error(`Roblox OAuth token exchange returned HTTP ${response.status}`);
    const tokens = await response.json();
    const profileResponse = await fetchImpl('https://apis.roblox.com/oauth/v1/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` }, signal: AbortSignal.timeout(8000),
    });
    if (!profileResponse.ok) throw new Error(`Roblox OAuth profile returned HTTP ${profileResponse.status}`);
    return profileResponse.json();
  }

  function apiAuthorized(request) {
    if (!config.authenticationApiKey) return false;
    const supplied = request.headers['x-api-key'] || request.headers.authorization?.replace(/^Bearer\s+/i, '');
    if (!supplied) return false;
    const expectedBuffer = Buffer.from(config.authenticationApiKey);
    const suppliedBuffer = Buffer.from(supplied);
    return expectedBuffer.length === suppliedBuffer.length && timingSafeEqual(expectedBuffer, suppliedBuffer);
  }

  async function handleRequest(request, response) {
    const url = new URL(request.url, 'http://localhost');
    const apiMatch = url.pathname.match(/^\/api\/authentication\/(\d+)$/);
    if (request.method === 'GET' && apiMatch) {
      if (!apiAuthorized(request)) {
        response.writeHead(config.authenticationApiKey ? 401 : 503, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
        response.end(JSON.stringify({ error: config.authenticationApiKey ? 'Unauthorized' : 'Authentication API is not configured' }));
        return true;
      }
      const record = await database.getByRobloxId(apiMatch[1]);
      response.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      response.end(JSON.stringify(record
        ? { authenticated: true, discord_user_id: String(record.discord_user_id), roblox_user_id: Number(record.roblox_user_id) }
        : { authenticated: false, roblox_user_id: Number(apiMatch[1]) }));
      return true;
    }
    if (url.pathname !== '/auth/roblox/callback') return false;
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    if (!code || !state) { html(response, 400, 'Authentication failed', 'The Roblox authorization response was incomplete.'); return true; }

    let savedDiscordId = null;
    let member = null;
    let authenticatedRole = null;
    let previousNickname;
    try {
      const session = await database.consumePending(hashState(state));
      if (!session) throw new Error('This authentication link is invalid or expired');
      const profile = await exchangeCode(code, session.code_verifier);
      if (String(profile.sub) !== String(session.expected_roblox_user_id)) {
        throw new Error('The authorized Roblox account did not match the requested username');
      }
      const currentUser = await roblox.getUsernameFromUserId(profile.sub);
      await database.saveAuthentication({ discordUserId: session.discord_user_id, robloxUserId: profile.sub, robloxUsername: currentUser.name, rpName: session.rp_name });
      savedDiscordId = session.discord_user_id;
      const guild = await client.guilds.fetch(session.guild_id);
      const effectiveConfig = await getGuildConfig(session.guild_id);
      member = await guild.members.fetch(session.discord_user_id);
      authenticatedRole = await guild.roles.fetch(effectiveConfig.authenticatedRoleId);
      if (!authenticatedRole || !authenticatedRole.editable) throw new Error('The configured Authenticated role is not manageable by the bot');
      if (!member.manageable) throw new Error('The bot role must be above the member before setting their RP name');
      previousNickname = member.nickname;
      await member.setNickname(formatAuthenticatedNickname(session.rp_name, currentUser.name), 'Set authenticated Delta Air Lines RP name');
      await member.roles.add(authenticatedRole, `Authenticated Roblox user ${profile.sub}`);
      if (effectiveConfig.unauthenticatedRoleId && member.roles.cache.has(effectiveConfig.unauthenticatedRoleId)) {
        const unauthenticatedRole = await guild.roles.fetch(effectiveConfig.unauthenticatedRoleId);
        if (!unauthenticatedRole?.editable) throw new Error('The configured Unauthenticated role is not manageable by the bot');
        await member.roles.remove(unauthenticatedRole, `Authenticated Roblox user ${profile.sub}`);
      }
      let sync = { membership: null, added: [], removed: [] };
      try {
        const protectedRoleIds = database.getManualRoleIds
          ? await database.getManualRoleIds(session.guild_id, member.id)
          : [];
        sync = await roleSync.sync(member, profile.sub, effectiveConfig, protectedRoleIds);
        await database.saveAuthentication({
          discordUserId: member.id,
          robloxUserId: profile.sub,
          robloxUsername: currentUser.name,
          robloxRoleId: sync.membership?.role?.id,
          robloxRoleName: sync.membership?.role?.name,
        });
      } catch (syncError) { console.error('Post-authentication role sync failed:', syncError); }
      await member.send({ embeds: [{ color: 0x2E8540, title: '✅ Authentication Complete', fields: [
        { name: 'Discord', value: `${member}`, inline: true }, { name: 'Roblox', value: currentUser.name, inline: true },
        { name: 'Roblox ID', value: String(profile.sub), inline: true }, { name: 'RP Name', value: session.rp_name, inline: true },
        { name: 'Status', value: 'Authenticated', inline: true },
      ] }] }).catch(() => {});
      html(response, 200, 'Authentication complete', `${currentUser.name} is now linked to your Discord account.`);
    } catch (error) {
      console.error('Roblox authentication callback failed:', error);
      if (savedDiscordId) {
        await database.unlink(savedDiscordId).catch((cleanupError) => console.error('Could not roll back authentication record:', cleanupError));
        if (member && authenticatedRole && member.roles.cache.has(authenticatedRole.id)) {
          await member.roles.remove(authenticatedRole, 'Roll back failed Roblox authentication').catch(() => {});
        }
        if (member && member.manageable) {
          await member.setNickname(previousNickname ?? null, 'Roll back failed Roblox authentication').catch(() => {});
        }
      }
      const duplicate = error.code === 'DUPLICATE_AUTHENTICATION';
      html(response, duplicate ? 409 : 400, 'Authentication failed', duplicate ? 'That Discord or Roblox account is already linked. Contact leadership.' : error.message);
    }
    return true;
  }

  return { begin, configured, configurationIssues, handleRequest };
}

module.exports = {
  createAuthenticationService,
  formatAuthenticatedNickname,
  hashState,
  validateOAuthRedirectUri,
  validateRpName,
};

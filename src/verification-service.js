const { createHash, randomBytes, timingSafeEqual } = require('node:crypto');

const DELTA_BLUE = 0x071D49;
const hashState = (state) => createHash('sha256').update(state).digest('hex');
const base64UrlHash = (value) => createHash('sha256').update(value).digest('base64url');

function html(response, status, title, message) {
  response.writeHead(status, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
  response.end(`<!doctype html><html><head><meta name="viewport" content="width=device-width"><title>${title}</title></head><body style="font-family:system-ui;background:#071D49;color:#fff;padding:3rem"><h1>${title}</h1><p>${message}</p><p>You may close this page and return to Discord.</p></body></html>`);
}

function createVerificationService({ config, database, roblox, roleSync, client, fetchImpl = global.fetch }) {
  function configured() {
    return Boolean(database.configured && config.robloxOauthClientId
      && config.robloxOauthClientSecret && config.robloxOauthRedirectUri && config.verifiedRoleId);
  }

  async function begin(discordUserId, guildId, username) {
    if (!configured()) throw new Error('Verification is not fully configured by an administrator');
    const installedInOneGuild = client.guilds.cache?.size === 1;
    if (!installedInOneGuild && config.guildId && String(guildId) !== String(config.guildId)) {
      throw new Error('Use verification in the configured Delta Air Lines server');
    }
    const existing = await database.getByDiscordId(discordUserId);
    if (existing) throw new Error('Your Discord account is already verified. Contact leadership to unlink it.');
    const user = await roblox.getUserByUsername(username);
    const linked = await database.getByRobloxId(user.id);
    if (linked) throw new Error('That Roblox account is already linked. Contact leadership if this is incorrect.');

    const state = randomBytes(32).toString('base64url');
    const codeVerifier = randomBytes(48).toString('base64url');
    await database.createPending({ stateHash: hashState(state), discordUserId, guildId, robloxUserId: user.id, codeVerifier });
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
        embeds: [{ color: DELTA_BLUE, title: '🔐 Verify Roblox Ownership', description: `Continue to Roblox to prove that you own **${user.name}**. This link expires in 10 minutes.` }],
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
    if (!config.verificationApiKey) return false;
    const supplied = request.headers['x-api-key'] || request.headers.authorization?.replace(/^Bearer\s+/i, '');
    if (!supplied) return false;
    const expectedBuffer = Buffer.from(config.verificationApiKey);
    const suppliedBuffer = Buffer.from(supplied);
    return expectedBuffer.length === suppliedBuffer.length && timingSafeEqual(expectedBuffer, suppliedBuffer);
  }

  async function handleRequest(request, response) {
    const url = new URL(request.url, 'http://localhost');
    const apiMatch = url.pathname.match(/^\/api\/verification\/(\d+)$/);
    if (request.method === 'GET' && apiMatch) {
      if (!apiAuthorized(request)) {
        response.writeHead(config.verificationApiKey ? 401 : 503, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
        response.end(JSON.stringify({ error: config.verificationApiKey ? 'Unauthorized' : 'Verification API is not configured' }));
        return true;
      }
      const record = await database.getByRobloxId(apiMatch[1]);
      response.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      response.end(JSON.stringify(record
        ? { verified: true, discord_user_id: String(record.discord_user_id), roblox_user_id: Number(record.roblox_user_id) }
        : { verified: false, roblox_user_id: Number(apiMatch[1]) }));
      return true;
    }
    if (url.pathname !== '/auth/roblox/callback') return false;
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    if (!code || !state) { html(response, 400, 'Verification failed', 'The Roblox authorization response was incomplete.'); return true; }

    let savedDiscordId = null;
    let member = null;
    let verifiedRole = null;
    try {
      const session = await database.consumePending(hashState(state));
      if (!session) throw new Error('This verification link is invalid or expired');
      const profile = await exchangeCode(code, session.code_verifier);
      if (String(profile.sub) !== String(session.expected_roblox_user_id)) {
        throw new Error('The authorized Roblox account did not match the requested username');
      }
      const currentUser = await roblox.getUsernameFromUserId(profile.sub);
      await database.saveVerification({ discordUserId: session.discord_user_id, robloxUserId: profile.sub, robloxUsername: currentUser.name });
      savedDiscordId = session.discord_user_id;
      const guild = await client.guilds.fetch(session.guild_id);
      member = await guild.members.fetch(session.discord_user_id);
      verifiedRole = await guild.roles.fetch(config.verifiedRoleId);
      if (!verifiedRole || !verifiedRole.editable) throw new Error('The configured Verified role is not manageable by the bot');
      await member.roles.add(verifiedRole, `Verified Roblox user ${profile.sub}`);
      if (config.unverifiedRoleId && member.roles.cache.has(config.unverifiedRoleId)) {
        const unverifiedRole = await guild.roles.fetch(config.unverifiedRoleId);
        if (!unverifiedRole?.editable) throw new Error('The configured Unverified role is not manageable by the bot');
        await member.roles.remove(unverifiedRole, `Verified Roblox user ${profile.sub}`);
      }
      let sync = { membership: null, added: [], removed: [] };
      try { sync = await roleSync.sync(member, profile.sub); } catch (syncError) { console.error('Post-verification role sync failed:', syncError); }
      await member.send({ embeds: [{ color: 0x2E8540, title: '✅ Verification Complete', fields: [
        { name: 'Discord', value: `${member}`, inline: true }, { name: 'Roblox', value: currentUser.name, inline: true },
        { name: 'Roblox ID', value: String(profile.sub), inline: true }, { name: 'Status', value: 'Verified', inline: true },
      ] }] }).catch(() => {});
      html(response, 200, 'Verification complete', `${currentUser.name} is now linked to your Discord account.`);
    } catch (error) {
      console.error('Roblox verification callback failed:', error);
      if (savedDiscordId) {
        await database.unlink(savedDiscordId).catch((cleanupError) => console.error('Could not roll back verification record:', cleanupError));
        if (member && verifiedRole && member.roles.cache.has(verifiedRole.id)) {
          await member.roles.remove(verifiedRole, 'Roll back failed Roblox verification').catch(() => {});
        }
      }
      const duplicate = error.code === 'DUPLICATE_VERIFICATION';
      html(response, duplicate ? 409 : 400, 'Verification failed', duplicate ? 'That Discord or Roblox account is already linked. Contact leadership.' : error.message);
    }
    return true;
  }

  return { begin, configured, handleRequest };
}

module.exports = { createVerificationService, hashState };

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { createAuthenticationService, hashState, validateRpName } = require('../src/authentication-service');

function responseRecorder() {
  return { writeHead(status, headers) { this.status = status; this.headers = headers; }, end(body) { this.body = body; } };
}

function setup(profileSub = '123', guildId = 'guild') {
  const records = new Map();
  const pending = new Map();
  const database = {
    configured: true,
    getByDiscordId: async (id) => records.get(`d:${id}`) ?? null,
    getByRobloxId: async (id) => records.get(`r:${id}`) ?? null,
    createPending: async (entry) => pending.set(entry.stateHash, entry),
    consumePending: async (stateHash) => { const value = pending.get(stateHash); pending.delete(stateHash); return value ? { discord_user_id: value.discordUserId, guild_id: value.guildId, expected_roblox_user_id: value.robloxUserId, code_verifier: value.codeVerifier, rp_name: value.rpName } : null; },
    saveAuthentication: async (entry) => { const record = { discord_user_id: entry.discordUserId, roblox_user_id: entry.robloxUserId, roblox_username: entry.robloxUsername, rp_name: entry.rpName }; records.set(`d:${entry.discordUserId}`, record); records.set(`r:${entry.robloxUserId}`, record); return record; },
  };
  const member = { toString: () => '<@discord>', manageable: true, setNickname: async (name) => { member.nickname = name; }, roles: { cache: new Map(), add: async () => {} }, send: async () => {} };
  const config = {
    guildId, authenticatedRoleId: 'authenticated', unauthenticatedRoleId: 'unauthenticated', robloxGroupId: '50', roleMappings: {}, managedRoleIds: [], authenticationApiKey: 'api-secret',
    robloxOauthClientId: 'client', robloxOauthClientSecret: 'secret', robloxOauthRedirectUri: 'https://bot.example/auth/roblox/callback',
  };
  const fetchImpl = async (url) => url.endsWith('/token')
    ? { ok: true, json: async () => ({ access_token: 'access' }) }
    : { ok: true, json: async () => ({ sub: profileSub, preferred_username: 'DeltaPilot' }) };
  const service = createAuthenticationService({ config, database, fetchImpl,
    roblox: { getUserByUsername: async () => ({ id: 123, name: 'DeltaPilot' }), getUsernameFromUserId: async () => ({ id: 123, name: 'DeltaPilot' }) },
    roleSync: { sync: async () => ({ membership: null, added: [], removed: [] }) },
    client: { guilds: { cache: new Map([['guild', {}]]), fetch: async () => ({ members: { fetch: async () => member }, roles: { fetch: async () => ({ id: 'authenticated', editable: true }) } }) } },
  });
  return { service, database, records, pending, member };
}

test('authentication begins with persistent state and completes only for the authorized Roblox ID', async () => {
  const { service, records, pending, member } = setup();
  const started = await service.begin('discord', 'guild', 'DeltaPilot', 'Jordan S.');
  const authorization = new URL(started.payload.components[0].components[0].url);
  const state = authorization.searchParams.get('state');
  assert.equal(pending.has(hashState(state)), true);
  assert.equal(authorization.searchParams.get('code_challenge_method'), 'S256');
  const response = responseRecorder();
  assert.equal(await service.handleRequest({ method: 'GET', url: `/auth/roblox/callback?code=code&state=${state}`, headers: {} }, response), true);
  assert.equal(response.status, 200);
  assert.equal(records.get('d:discord').roblox_user_id, '123');
  assert.equal(records.get('d:discord').rp_name, 'Jordan S.');
  assert.equal(member.nickname, 'Jordan S. (@DeltaPilot)');
});

test('authentication lookup API requires its server-side API key', async () => {
  const { service, records } = setup();
  records.set('r:123', { discord_user_id: 'discord', roblox_user_id: '123' });
  const denied = responseRecorder();
  await service.handleRequest({ method: 'GET', url: '/api/authentication/123', headers: {} }, denied);
  assert.equal(denied.status, 401);
  const allowed = responseRecorder();
  await service.handleRequest({ method: 'GET', url: '/api/authentication/123', headers: { 'x-api-key': 'api-secret' } }, allowed);
  assert.deepEqual(JSON.parse(allowed.body), { authenticated: true, discord_user_id: 'discord', roblox_user_id: 123 });
});


test('authentication rejects a different Roblox account returned by OAuth', async () => {
  const { service, records, pending } = setup('999');
  const started = await service.begin('discord', 'guild', 'DeltaPilot', 'Jordan S.');
  const state = new URL(started.payload.components[0].components[0].url).searchParams.get('state');
  assert.equal(pending.has(hashState(state)), true);
  const response = responseRecorder();
  await service.handleRequest({ method: 'GET', url: `/auth/roblox/callback?code=code&state=${state}`, headers: {} }, response);
  assert.equal(response.status, 400);
  assert.equal(records.has('d:discord'), false);
});

test('authentication refuses duplicate Discord and Roblox links before OAuth', async () => {
  const { service, records } = setup();
  records.set('r:123', { discord_user_id: 'someone-else', roblox_user_id: '123' });
  await assert.rejects(service.begin('discord', 'guild', 'DeltaPilot', 'Jordan S.'), /already linked/);
  records.delete('r:123');
  records.set('d:discord', { discord_user_id: 'discord', roblox_user_id: '456' });
  await assert.rejects(service.begin('discord', 'guild', 'DeltaPilot', 'Jordan S.'), /already authenticated/);
});

test('authentication works without GUILD_ID when the bot is installed in one server', async () => {
  const { service, pending } = setup('123', null);
  assert.equal(service.configured(), true);
  const started = await service.begin('discord', 'the-only-guild', 'DeltaPilot', 'Jordan S.');
  const state = new URL(started.payload.components[0].components[0].url).searchParams.get('state');
  assert.equal(pending.get(hashState(state)).guildId, 'the-only-guild');
  assert.match(fs.readFileSync('src/index.js', 'utf8'), /!config\.guildId \|\| String\(interaction\.guildId\)/);
});

test('a stale GUILD_ID does not block authentication when the bot has only one server', async () => {
  const { service } = setup('123', 'old-guild-id');
  await assert.doesNotReject(service.begin('discord', 'the-only-current-guild', 'DeltaPilot', 'Jordan S.'));
});

test('RP names require a first name, last initial, and non-real-name confirmation', () => {
  assert.equal(validateRpName('Jordan', 's', 'CONFIRMED'), 'Jordan S.');
  assert.throws(() => validateRpName('Jordan Smith', 'S', 'CONFIRMED'), /first name/);
  assert.throws(() => validateRpName('Jordan', 'S', 'yes'), /not your real name/);
});


test('incomplete authentication reports the exact missing Render variables', async () => {
  const incomplete = createAuthenticationService({
    config: {}, database: { configured: false }, roblox: {}, roleSync: {}, client: { guilds: { cache: new Map() } },
  });
  assert.deepEqual(incomplete.configurationIssues(), [
    'DATABASE_URL', 'ROBLOX_OAUTH_CLIENT_ID', 'ROBLOX_OAUTH_CLIENT_SECRET', 'ROBLOX_OAUTH_REDIRECT_URI',
  ]);
  await assert.rejects(incomplete.begin('discord', 'guild', 'DeltaPilot', 'Jordan S.'), /DATABASE_URL.*ROBLOX_OAUTH_CLIENT_ID/);
});

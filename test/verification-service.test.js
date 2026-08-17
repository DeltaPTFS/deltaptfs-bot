const test = require('node:test');
const assert = require('node:assert/strict');
const { createVerificationService, hashState } = require('../src/verification-service');

function responseRecorder() {
  return { writeHead(status, headers) { this.status = status; this.headers = headers; }, end(body) { this.body = body; } };
}

function setup(profileSub = '123') {
  const records = new Map();
  const pending = new Map();
  const database = {
    configured: true,
    getByDiscordId: async (id) => records.get(`d:${id}`) ?? null,
    getByRobloxId: async (id) => records.get(`r:${id}`) ?? null,
    createPending: async (entry) => pending.set(entry.stateHash, entry),
    consumePending: async (stateHash) => { const value = pending.get(stateHash); pending.delete(stateHash); return value ? { discord_user_id: value.discordUserId, guild_id: value.guildId, expected_roblox_user_id: value.robloxUserId, code_verifier: value.codeVerifier } : null; },
    saveVerification: async (entry) => { const record = { discord_user_id: entry.discordUserId, roblox_user_id: entry.robloxUserId, roblox_username: entry.robloxUsername }; records.set(`d:${entry.discordUserId}`, record); records.set(`r:${entry.robloxUserId}`, record); return record; },
  };
  const member = { toString: () => '<@discord>', roles: { add: async () => {} }, send: async () => {} };
  const config = {
    guildId: 'guild', verifiedRoleId: 'verified', verificationApiKey: 'api-secret',
    robloxOauthClientId: 'client', robloxOauthClientSecret: 'secret', robloxOauthRedirectUri: 'https://bot.example/auth/roblox/callback',
  };
  const fetchImpl = async (url) => url.endsWith('/token')
    ? { ok: true, json: async () => ({ access_token: 'access' }) }
    : { ok: true, json: async () => ({ sub: profileSub, preferred_username: 'DeltaPilot' }) };
  const service = createVerificationService({ config, database, fetchImpl,
    roblox: { getUserByUsername: async () => ({ id: 123, name: 'DeltaPilot' }), getUsernameFromUserId: async () => ({ id: 123, name: 'DeltaPilot' }) },
    roleSync: { sync: async () => ({ membership: null, added: [], removed: [] }) },
    client: { guilds: { fetch: async () => ({ members: { fetch: async () => member }, roles: { fetch: async () => ({ id: 'verified', editable: true }) } }) } },
  });
  return { service, database, records, pending };
}

test('verification begins with persistent state and completes only for the authorized Roblox ID', async () => {
  const { service, records, pending } = setup();
  const started = await service.begin('discord', 'guild', 'DeltaPilot');
  const authorization = new URL(started.payload.components[0].components[0].url);
  const state = authorization.searchParams.get('state');
  assert.equal(pending.has(hashState(state)), true);
  assert.equal(authorization.searchParams.get('code_challenge_method'), 'S256');
  const response = responseRecorder();
  assert.equal(await service.handleRequest({ method: 'GET', url: `/auth/roblox/callback?code=code&state=${state}`, headers: {} }, response), true);
  assert.equal(response.status, 200);
  assert.equal(records.get('d:discord').roblox_user_id, '123');
});

test('verification lookup API requires its server-side API key', async () => {
  const { service, records } = setup();
  records.set('r:123', { discord_user_id: 'discord', roblox_user_id: '123' });
  const denied = responseRecorder();
  await service.handleRequest({ method: 'GET', url: '/api/verification/123', headers: {} }, denied);
  assert.equal(denied.status, 401);
  const allowed = responseRecorder();
  await service.handleRequest({ method: 'GET', url: '/api/verification/123', headers: { 'x-api-key': 'api-secret' } }, allowed);
  assert.deepEqual(JSON.parse(allowed.body), { verified: true, discord_user_id: 'discord', roblox_user_id: 123 });
});


test('verification rejects a different Roblox account returned by OAuth', async () => {
  const { service, records, pending } = setup('999');
  const started = await service.begin('discord', 'guild', 'DeltaPilot');
  const state = new URL(started.payload.components[0].components[0].url).searchParams.get('state');
  assert.equal(pending.has(hashState(state)), true);
  const response = responseRecorder();
  await service.handleRequest({ method: 'GET', url: `/auth/roblox/callback?code=code&state=${state}`, headers: {} }, response);
  assert.equal(response.status, 400);
  assert.equal(records.has('d:discord'), false);
});

test('verification refuses duplicate Discord and Roblox links before OAuth', async () => {
  const { service, records } = setup();
  records.set('r:123', { discord_user_id: 'someone-else', roblox_user_id: '123' });
  await assert.rejects(service.begin('discord', 'guild', 'DeltaPilot'), /already linked/);
  records.delete('r:123');
  records.set('d:discord', { discord_user_id: 'discord', roblox_user_id: '456' });
  await assert.rejects(service.begin('discord', 'guild', 'DeltaPilot'), /already verified/);
});

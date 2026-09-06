const test = require('node:test');
const assert = require('node:assert/strict');
const { createRobloxService } = require('../src/roblox-service');

test('resolves usernames and selects configured group membership by immutable IDs', async () => {
  const responses = [
    { data: [{ id: 123, name: 'DeltaPilot' }] },
    { data: [{ group: { id: 50 }, role: { id: 9, rank: 100, name: 'Flight Deck' } }] },
  ];
  const calls = [];
  const service = createRobloxService({ groupId: '50', fetchImpl: async (url, options) => {
    calls.push([url, options]);
    return { ok: true, status: 200, json: async () => responses.shift() };
  } });
  assert.equal((await service.getUserByUsername('DeltaPilot')).id, 123);
  assert.equal((await service.getGroupMembership(123)).role.id, 9);
  assert.match(calls[0][0], /usernames\/users/);
  assert.match(calls[1][0], /users\/123\/groups\/roles/);
});

test('validates usernames and reports Roblox API failures', async () => {
  const service = createRobloxService({ fetchImpl: async () => ({ ok: false, status: 503 }) });
  await assert.rejects(service.getUserByUsername('bad name!'), /valid Roblox username/);
  await assert.rejects(service.getUsernameFromUserId(123), /HTTP 503/);
});

const test = require('node:test');
const assert = require('node:assert/strict');
const { createRobloxRoleSync, ROBLOX_COMMUNITY_URL } = require('../src/roblox-roles');

class MockCollection extends Map {
  find(predicate) { return [...this.values()].find(predicate); }
  filter(predicate) { return new MockCollection([...this].filter(([, value]) => predicate(value))); }
}

test('syncs the Delta community rank and removes an obsolete community rank', async () => {
  const requests = [];
  const responses = [
    { data: [{ id: 42, name: 'DeltaPilot' }] },
    { roles: [{ id: 1, name: 'Guest', rank: 1 }, { id: 2, name: 'Captain', rank: 100 }] },
    { data: [{ group: { id: 123 }, role: { id: 2, name: 'Captain', rank: 100 } }] },
  ];
  const fetchImpl = async (url, options) => {
    requests.push([url, options]);
    return { ok: true, json: async () => responses.shift() };
  };
  const guest = { id: 'guest', name: 'Guest | Delta Air Lines', editable: true };
  const captain = { id: 'captain', name: 'Captain | Delta Air Lines', editable: true };
  const verified = { id: 'verified', name: 'Verified | Delta Air Lines', editable: true };
  const unverified = { id: 'unverified', name: 'Unverified | Delta Air Lines', editable: true };
  const memberRoles = new MockCollection([[guest.id, guest], [unverified.id, unverified]]);
  memberRoles.cache = memberRoles;
  memberRoles.remove = async (roles) => {
    const entries = typeof roles?.values === 'function' ? [...roles.values()] : [roles];
    entries.forEach((role) => memberRoles.delete(role.id));
  };
  memberRoles.add = async (role) => memberRoles.set(role.id, role);
  const guildRoles = new MockCollection([
    [guest.id, guest], [captain.id, captain], [verified.id, verified], [unverified.id, unverified],
  ]);
  const member = {
    guild: { roles: { cache: guildRoles } },
    roles: memberRoles,
    displayName: 'Old Name',
    manageable: true,
    setNickname: async (name) => { member.displayName = name; },
  };
  const sync = createRobloxRoleSync({ environment: { ROBLOX_COMMUNITY_ID: '123' }, fetchImpl });

  const result = await sync.syncMember(member, 'DeltaPilot');

  assert.equal(result.role.id, captain.id);
  assert.equal(memberRoles.has(guest.id), false);
  assert.equal(memberRoles.has(captain.id), true);
  assert.equal(memberRoles.has(verified.id), true);
  assert.equal(memberRoles.has(unverified.id), false);
  assert.equal(member.displayName, 'DeltaPilot');
  assert.equal(requests.length, 3);
  assert.equal(ROBLOX_COMMUNITY_URL, 'https://www.roblox.com/share/g/650682730');
});

test('requires a numeric community ID configuration', () => {
  assert.equal(createRobloxRoleSync({ environment: {} }).configured(), false);
});

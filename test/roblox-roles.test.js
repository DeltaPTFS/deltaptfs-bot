const test = require('node:test');
const assert = require('node:assert/strict');
const { Collection } = require('discord.js');
const { createRobloxRoleSync, ROBLOX_COMMUNITY_URL } = require('../src/roblox-roles');

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
  const guest = { id: 'guest', name: 'Guest | Delta PTFS', editable: true };
  const captain = { id: 'captain', name: 'Captain | Delta PTFS', editable: true };
  const memberRoles = new Collection([[guest.id, guest]]);
  memberRoles.cache = memberRoles;
  memberRoles.remove = async (roles) => roles.forEach((role) => memberRoles.delete(role.id));
  memberRoles.add = async (role) => memberRoles.set(role.id, role);
  const guildRoles = new Collection([[guest.id, guest], [captain.id, captain]]);
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
  assert.equal(member.displayName, 'DeltaPilot');
  assert.equal(requests.length, 3);
  assert.equal(ROBLOX_COMMUNITY_URL, 'https://www.roblox.com/share/g/650682730');
});

test('requires a numeric community ID configuration', () => {
  assert.equal(createRobloxRoleSync({ environment: {} }).configured(), false);
});

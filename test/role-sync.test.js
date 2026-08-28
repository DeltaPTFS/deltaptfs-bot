const test = require('node:test');
const assert = require('node:assert/strict');
const { createRoleSyncService } = require('../src/role-sync');

function collection(entries) {
  const map = new Map(entries);
  map.filter = (predicate) => new Map([...map].filter(([, value]) => predicate(value)));
  return map;
}

test('role sync adds mapped roles, removes only obsolete managed roles, and preserves unrelated roles', async () => {
  const desired = { id: 'new', name: 'Flight Deck', position: 10, managed: false, toString: () => '<@&new>' };
  const obsolete = { id: 'old', name: 'Cabin Crew', position: 9, managed: false, toString: () => '<@&old>' };
  const unrelated = { id: 'keep', name: 'Event Ping', position: 5, managed: false };
  const cache = collection([[obsolete.id, obsolete], [unrelated.id, unrelated]]);
  const actions = [];
  const member = {
    guild: {
      members: { me: { roles: { highest: { position: 100 } } } },
      roles: { cache: collection([[desired.id, desired], [obsolete.id, obsolete], [unrelated.id, unrelated]]), fetch: async (id) => ({ new: desired, old: obsolete }[id]) },
    },
    roles: {
      cache,
      add: async (role) => { actions.push(['add', role.id]); cache.set(role.id, role); },
      remove: async (role) => { actions.push(['remove', role.id]); cache.delete(role.id); },
    },
  };
  const service = createRoleSyncService({
    config: { roleMappings: { 7: ['new'] }, managedRoleIds: ['new', 'old'] },
    roblox: { getGroupMembership: async () => ({ role: { id: 7, rank: 20, name: 'Flight Deck' } }) },
  });
  const result = await service.sync(member, '123');
  assert.deepEqual(actions, [['add', 'new'], ['remove', 'old']]);
  assert.equal(cache.has('keep'), true);
  assert.deepEqual(result.added, [desired]);
  assert.deepEqual(result.removed, [obsolete]);
});

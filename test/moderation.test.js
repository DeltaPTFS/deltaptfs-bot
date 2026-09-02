const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { ROLE_GROUPS } = require('../src/roles');
const {
  TIMEOUT_DURATIONS,
  canUseFounderCommands,
  canUseLeadershipCommands,
  targetHierarchyError,
} = require('../src/moderation');

function member(roleName, position = 50) {
  const role = { id: roleName, name: `${roleName} | Delta Air Lines`, position };
  const cache = new Map([[role.id, role]]);
  cache.some = (predicate) => [...cache.values()].some(predicate);
  return { id: roleName, guild: { roles: { cache } }, roles: { cache, highest: role } };
}

test('leadership commands accept leadership and founders while founder commands remain exclusive', () => {
  const leader = member('Delta Leadership');
  const founder = member('Delta Founder', 100);
  const passenger = member('Passenger', 1);
  assert.equal(canUseLeadershipCommands(leader, ROLE_GROUPS), true);
  assert.equal(canUseLeadershipCommands(founder, ROLE_GROUPS), true);
  assert.equal(canUseLeadershipCommands(passenger, ROLE_GROUPS), false);
  assert.equal(canUseFounderCommands(founder), true);
  assert.equal(canUseFounderCommands(leader), false);
});

test('moderation hierarchy and timeout durations are enforced', () => {
  const caller = member('Delta Leadership', 50);
  const lower = member('Passenger', 1);
  assert.equal(targetHierarchyError(caller, lower, 'owner'), null);
  assert.match(targetHierarchyError(caller, member('Equal', 50), 'owner'), /equal to or higher/);
  assert.equal(TIMEOUT_DURATIONS['1h'], 3_600_000);
  assert.equal(TIMEOUT_DURATIONS['1w'], 604_800_000);
});

test('falls back to configured Delta role names if a configured role ID is unavailable', () => {
  assert.equal(canUseLeadershipCommands(member('Delta Leadership'), ROLE_GROUPS, 'missing-role'), true);
  assert.equal(canUseFounderCommands(member('Delta Founder'), 'missing-role'), true);
});

test('moderation slash commands and action handlers are registered', () => {
  const source = fs.readFileSync('src/index.js', 'utf8');
  for (const command of ['timeout', 'kick', 'ban', 'delete']) assert.match(source, new RegExp(`setName\\('${command}'\\)`));
  assert.match(source, /Only Delta Founders may use this command/);
  assert.match(source, /Delta Leadership or higher/);
  assert.match(source, /target\.timeout/);
  assert.match(source, /target\.kick/);
  assert.match(source, /target\.ban/);
  assert.match(source, /bulkDelete/);
});

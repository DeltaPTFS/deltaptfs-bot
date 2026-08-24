const test = require('node:test');
const assert = require('node:assert/strict');
const { ROLE_GROUPS } = require('../src/roles');
const { ATC_SPEAKER_GROUPS, atcRolePolicies } = require('../src/permissions');

test('ATC voice policy explicitly covers every member role', () => {
  const roles = ROLE_GROUPS.flatMap((group) => group.roles);
  const policies = atcRolePolicies();
  assert.equal(policies.length, roles.length);
  assert.deepEqual(
    new Set(policies.map(({ name }) => name)),
    new Set(roles.map(({ name }) => name)),
  );
});

test('higher ranks and all Flight Operations roles can speak', () => {
  const policies = new Map(atcRolePolicies().map((policy) => [policy.name, policy]));
  for (const group of ROLE_GROUPS) {
    for (const role of group.roles) {
      assert.equal(
        policies.get(role.name).canSpeak,
        ATC_SPEAKER_GROUPS.has(group.name),
        `${role.name} has incorrect speaking access`,
      );
    }
  }
  for (const name of ['Chief Pilot', 'Captain', 'First Officer', 'Air Traffic Control', 'Cabin Crew', 'Ground Crew']) {
    assert.equal(policies.get(name).canSpeak, true, `${name} must be able to speak`);
  }
});

test('only Air Traffic Control receives priority speaker', () => {
  assert.deepEqual(
    atcRolePolicies().filter(({ prioritySpeaker }) => prioritySpeaker).map(({ name }) => name),
    ['Air Traffic Control'],
  );
});

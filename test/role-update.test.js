const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const {
  EXECUTIVES_ROLE_ID,
  successEmbed,
  validateRoleUpdate,
} = require('../src/role-update');

function role(id, position, options = {}) {
  return { id, position, managed: false, toString: () => `<@&${id}>`, ...options };
}

function scenario(overrides = {}) {
  const executive = role(EXECUTIVES_ROLE_ID, 50);
  const everyone = role('guild', 0);
  const requestedRole = overrides.requestedRole ?? role('requested', 20);
  const caller = overrides.caller ?? { roles: { highest: role('caller', 50) }, toString: () => '<@caller>' };
  const target = overrides.target ?? {
    id: 'target',
    roles: { cache: new Map() },
    toString: () => '<@target>',
  };
  return {
    guild: {
      ownerId: 'owner',
      roles: { cache: new Map([[EXECUTIVES_ROLE_ID, executive]]), everyone },
    },
    caller,
    target,
    requestedRole,
    botMember: overrides.botMember ?? { roles: { highest: role('bot', 100) } },
  };
}

test('/update uses direct user and role options without a Roblox subcommand', () => {
  const source = fs.readFileSync('src/index.js', 'utf8');
  const command = source.slice(
    source.indexOf('const updateCommand'),
    source.indexOf('const getRoleCommand'),
  );
  assert.match(command, /addUserOption/);
  assert.match(command, /addRoleOption/);
  assert.doesNotMatch(command, /addSubcommand|roblox-username|user-role/);
});

test('allows callers whose highest role equals or exceeds Executives', () => {
  assert.equal(validateRoleUpdate(scenario()).ok, true);
  const above = scenario({ caller: { roles: { highest: role('board', 80) } } });
  assert.equal(validateRoleUpdate(above).ok, true);
});

test('denies callers below Executives before other validation', () => {
  const input = scenario({
    caller: { roles: { highest: role('low', 49) } },
    target: { id: 'owner', roles: { cache: new Map() } },
  });
  assert.equal(validateRoleUpdate(input).embed.title, '❌ Access Denied');
});

test('enforces owner, caller, bot, everyone, and managed-role safeguards in order', () => {
  assert.equal(validateRoleUpdate(scenario({
    target: { id: 'owner', roles: { cache: new Map() } },
  })).embed.title, '❌ Unable to Update Member');

  assert.match(validateRoleUpdate(scenario({ requestedRole: role('high', 50) })).embed.description, /equal to or higher/);
  assert.match(validateRoleUpdate(scenario({
    requestedRole: role('bot-high', 40),
    botMember: { roles: { highest: role('bot', 40) } },
  })).embed.description, /bot role must be positioned above/);

  const everyoneInput = scenario();
  everyoneInput.requestedRole = everyoneInput.guild.roles.everyone;
  assert.match(validateRoleUpdate(everyoneInput).embed.description, /@everyone/);
  assert.match(validateRoleUpdate(scenario({ requestedRole: role('managed', 20, { managed: true }) })).embed.description, /managed/);
});

test('reports existing roles and builds the requested confirmation embed', () => {
  const input = scenario();
  input.target.roles.cache.set(input.requestedRole.id, input.requestedRole);
  assert.equal(validateRoleUpdate(input).embed.title, 'ℹ️ No Changes Required');

  const embed = successEmbed(input.target, input.requestedRole, input.caller);
  assert.equal(embed.title, '✅ Member Updated');
  assert.deepEqual(embed.fields.map(({ name }) => name), ['Member', 'Role Added', 'Updated By']);
});

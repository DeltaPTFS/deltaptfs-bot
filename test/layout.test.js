const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { SERVER_LAYOUT, formatLayout } = require('../src/layout');
const { ROLE_GROUPS, formatRoles, roleDefinitions } = require('../src/roles');

test('layout category and channel names are unique', () => {
  const categoryNames = SERVER_LAYOUT.map(({ name }) => name.toLowerCase());
  assert.equal(new Set(categoryNames).size, categoryNames.length);

  for (const category of SERVER_LAYOUT) {
    const names = category.channels.map(({ name }) => name.toLowerCase().replaceAll(' ', '-'));
    assert.equal(new Set(names).size, names.length, `duplicate in ${category.name}`);
  }
});

test('formatted preview includes private label and all channels', () => {
  const preview = formatLayout();
  assert.match(preview, /CREW OPERATIONS \(private\)/);
  const channelCount = SERVER_LAYOUT.reduce((sum, category) => sum + category.channels.length, 0);
  assert.equal(preview.split('\n').filter((line) => line.startsWith('  ')).length, channelCount);
});

test('onboarding layout removes frequencies and limits unauthenticated visibility', () => {
  assert.equal(SERVER_LAYOUT[0].name, 'INFORMATION CENTER');
  assert.equal(SERVER_LAYOUT[1].name, 'AUTHENTICATION');
  assert.deepEqual(SERVER_LAYOUT[0].channels.map(({ name }) => name), [
    'information', 'rules', 'announcements', 'help-desk',
  ]);
  assert.deepEqual(SERVER_LAYOUT[1].channels.map(({ name }) => name), [
    'authenticate', 'authentication-help',
  ]);
  assert.ok(SERVER_LAYOUT[0].channels.find(({ name }) => name === 'information').visibleToUnauthenticated);
  assert.ok(SERVER_LAYOUT[1].channels.every(({ visibleToUnauthenticated }) => visibleToUnauthenticated));
  assert.ok(SERVER_LAYOUT.slice(2).every(({ hideFromUnauthenticated }) => hideFromUnauthenticated));
  assert.ok(!SERVER_LAYOUT.some(({ name }) => /FREQUENC|AIR TRAFFIC CONTROL/.test(name)));
  assert.ok(!SERVER_LAYOUT.flatMap(({ channels }) => channels).some(({ name }) =>
    ['roles', 'faq', 'ATC Tower'].includes(name) || /\[\d{3}\.\d{3}\]/.test(name)));
});

test('role hierarchy has unique names and required department roles', () => {
  const roles = roleDefinitions().filter(({ baseName }) => baseName);
  const names = roles.map(({ name }) => name.toLowerCase());
  assert.equal(new Set(names).size, names.length);
  assert.ok(names.includes('senior administration | delta air lines'));
  assert.ok(names.includes('skymiles member | delta air lines'));
  assert.ok(names.includes('captain | delta air lines'));
  assert.ok(names.includes('lead of marketing department | delta air lines'));
  assert.ok(names.includes('lead of external affairs department | delta air lines'));
  assert.ok(names.includes('marketing manager | delta air lines'));
  assert.ok(names.includes('external affairs coordinator | delta air lines'));
  assert.match(formatRoles(), /@━━ FLIGHT OPERATIONS ━━/);
  assert.match(formatRoles(), /@Lead of ATC Department/);
});

test('marketing and external affairs roles have a complete department hierarchy', () => {
  const executives = ROLE_GROUPS.find(({ name }) => name === 'Executives');
  assert.ok(executives.roles.some(({ name }) => name === 'Lead of Marketing Department'));
  assert.ok(executives.roles.some(({ name }) => name === 'Lead of External Affairs Department'));

  const department = ROLE_GROUPS.find(({ name }) => name === 'Marketing & External Affairs');
  assert.deepEqual(department.roles.map(({ name }) => name), [
    'Marketing Manager',
    'External Affairs Manager',
    'Public Relations Manager',
    'Marketing Coordinator',
    'External Affairs Coordinator',
    'Community Relations Specialist',
  ]);
});

test('every configured role has a unique hexadecimal color and an app role exists', () => {
  const roles = roleDefinitions();
  assert.ok(roles.every(({ color }) => /^#[0-9A-F]{6}$/.test(color)));
  assert.equal(new Set(roles.map(({ color }) => color)).size, roles.length);
  assert.equal(roles.filter(({ app }) => app).length, 1);
});

test('role category separators appear below their member roles', () => {
  const definitions = roleDefinitions();
  for (const group of ROLE_GROUPS) {
    const preview = formatRoles();
    const lastMember = `@${group.roles.at(-1).name} | Delta Air Lines`;
    const separator = `@${group.categoryRole.name}`;
    assert.ok(preview.indexOf(lastMember) < preview.indexOf(separator));
    assert.ok(
      definitions.findIndex(({ baseName }) => baseName === group.roles.at(-1).name)
        < definitions.indexOf(group.categoryRole),
      `${group.name} separator must be positioned below all member roles`,
    );
  }
});

test('SkyMiles roles follow the real Medallion tier order', () => {
  const group = ROLE_GROUPS.find(({ name }) => name === 'SkyMiles Members');
  assert.deepEqual(
    group.roles.map(({ name }) => name),
    ['Diamond Medallion', 'Platinum Medallion', 'Gold Medallion', 'Silver Medallion', 'SkyMiles Member'],
  );
});

test('member roles use Delta Air Lines suffix while category separators do not', () => {
  for (const definition of roleDefinitions()) {
    if (definition.baseName) assert.equal(definition.name, `${definition.baseName} | Delta Air Lines`);
    else assert.match(definition.name, /^━━ .+ ━━$/);
  }
});

test('operational categories grant access only to explicitly configured roles', () => {
  const configuredRoles = new Set(
    ROLE_GROUPS.flatMap((group) => group.roles.map(({ name }) => name)),
  );
  for (const name of ['FLIGHT OPERATIONS', 'CREW OPERATIONS']) {
    const category = SERVER_LAYOUT.find((entry) => entry.name === name);
    assert.ok(category.accessRoles.every((role) => configuredRoles.has(role)));
    assert.ok(category.accessRoles.includes('Captain'));
    assert.ok(category.accessRoles.includes('Air Traffic Control'));
    assert.ok(category.accessRoles.includes('Senior Administration'));
    assert.ok(!category.accessRoles.includes('Passenger'));
    assert.ok(!category.accessRoles.includes('Guest'));
    assert.ok(!category.accessRoles.includes('SkyMiles Member'));
  }
});

test('Google Apps Script defines an authenticated append-only ledger', () => {
  const script = fs.readFileSync('integrations/google-apps-script.gs', 'utf8');
  assert.match(script, /getProperty\('WEBHOOK_SECRET'\)/);
  assert.match(script, /sheet\.appendRow/);
  assert.match(script, /Discord User ID/);
  assert.match(script, /Awarded By ID/);
});

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

test('ATC category contains a tower frequency for every supported island', () => {
  const atc = SERVER_LAYOUT.find(({ name }) => name === 'AIR TRAFFIC CONTROL');
  assert.ok(atc);

  const expectedAirports = ['IRFD', 'IPPH', 'IZOL', 'ITKO', 'IBTH', 'ISAB'];
  for (const airport of expectedAirports) {
    const tower = atc.channels.find(({ name }) => name.startsWith(`${airport} TWR [`));
    assert.equal(tower?.type, 'voice', `${airport} must have a tower voice channel`);
    assert.match(tower.name, /^\w{4} TWR \[\d{3}\.\d{3}\]$/);
  }
});

test('role hierarchy has unique names and required department roles', () => {
  const roles = ROLE_GROUPS.flatMap((group) => group.roles);
  const names = roles.map(({ name }) => name.toLowerCase());
  assert.equal(new Set(names).size, names.length);
  assert.ok(names.includes('senior administration'));
  assert.ok(names.includes('skymiles member'));
  assert.match(formatRoles(), /@━━ FLIGHT OPERATIONS ━━/);
  assert.match(formatRoles(), /@Lead of ATC Department/);
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
    const lastMember = `@${group.roles.at(-1).name}`;
    const separator = `@${group.categoryRole.name}`;
    assert.ok(preview.indexOf(lastMember) < preview.indexOf(separator));
    assert.ok(
      definitions.indexOf(group.roles.at(-1)) < definitions.indexOf(group.categoryRole),
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

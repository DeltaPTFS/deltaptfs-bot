const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { ATC_FREQUENCY_GROUPS, SERVER_LAYOUT, formatLayout } = require('../src/layout');
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

test('complete ATC frequency network is last, valid, and listen-only', () => {
  const frequencyCategories = SERVER_LAYOUT.filter(({ bottom }) => bottom);
  assert.deepEqual(frequencyCategories, SERVER_LAYOUT.slice(-ATC_FREQUENCY_GROUPS.length));
  assert.equal(frequencyCategories.length, 18);
  const channels = frequencyCategories.flatMap(({ channels }) => channels);
  assert.equal(channels.length, 65);
  assert.ok(frequencyCategories.every(({ channels: entries }) => entries.length <= 4));
  assert.ok(channels.every(({ name, type, flightDeckOnly }) =>
    /^🔊 (?:[A-Z]{2,4}_(?:DEL|GND|TWR|APP)|UNICOM) \[\d{3}\.\d{3}\]$/.test(name)
      && type === 'voice' && flightDeckOnly));
  assert.ok(channels.some(({ name }) => name === '🔊 IRFD_TWR [118.100]'));
  assert.ok(channels.some(({ name }) => name === '🔊 UNICOM [122.800]'));
  for (const [airport] of ATC_FREQUENCY_GROUPS) {
    const expectedName = airport === 'UNICOM' ? 'UNICOM FREQUENCY' : `${airport} FREQUENCIES`;
    assert.ok(frequencyCategories.some(({ name }) => name === expectedName));
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

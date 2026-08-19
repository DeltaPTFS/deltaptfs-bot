const test = require('node:test');
const assert = require('node:assert/strict');
const { loadConfig, mergeGuildConfig, parseRoleMappings } = require('../src/config');

test('central configuration combines mapped and explicitly managed role IDs', () => {
  const config = loadConfig({
    ROLE_MAPPINGS: '{"10":"100","20":"200"}',
    MANAGED_ROLE_IDS: '["200","300"]',
  });
  assert.equal(config.executiveRoleId, '1533718284615291042');
  assert.deepEqual(config.updateAllowedRoleIds, ['1539005023995043880', '1539005027748945971']);
  assert.deepEqual(config.roleMappings, { 10: ['100'], 20: ['200'] });
  assert.deepEqual(config.managedRoleIds, ['200', '300', '100']);
});

test('rejects malformed role mappings', () => {
  assert.throws(() => parseRoleMappings('{"Captain":"role"}'), /numeric Roblox role ID/);
});

test('stored guild configuration overrides core roles and extends environment mappings', () => {
  const base = loadConfig({ ROLE_MAPPINGS: '{"10":"100"}', MANAGED_ROLE_IDS: '[]' });
  const merged = mergeGuildConfig(base, {
    verifiedRoleId: 'verified', unverifiedRoleId: 'unverified', robloxGroupId: '50',
    roleMappings: { 20: ['200'] }, managedRoleIds: ['200'],
  });
  assert.equal(merged.verifiedRoleId, 'verified');
  assert.deepEqual(merged.roleMappings, { 10: ['100'], 20: ['200'] });
  assert.deepEqual(merged.managedRoleIds, ['100', '200']);
});

test('accepts common managed PostgreSQL URL variable names', () => {
  assert.equal(loadConfig({ POSTGRES_URL: 'postgresql://render' }).databaseUrl, 'postgresql://render');
  assert.equal(loadConfig({ POSTGRESQL_URL: 'postgresql://other' }).databaseUrl, 'postgresql://other');
  assert.equal(loadConfig({ DATABASE_URL: 'postgresql://primary', POSTGRES_URL: 'postgresql://fallback' }).databaseUrl, 'postgresql://primary');
});

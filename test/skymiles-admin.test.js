'use strict';
const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const {parseRoleIds,hasSkyMilesAdminRole} = require('../src/skymiles-admin');

test('only Owner/Admin role IDs grant SkyMiles mutation permission', () => {
  assert.equal(hasSkyMilesAdminRole(['1539005297417519205']), true);
  assert.equal(hasSkyMilesAdminRole(['1539005030189891684']), true);
  assert.equal(hasSkyMilesAdminRole(['1539005033020919828']), true);
  assert.equal(hasSkyMilesAdminRole(['1539968936681148456']), false); // Staff only
  assert.equal(hasSkyMilesAdminRole(['1539005061609422849']), false); // Member
  assert.equal(hasSkyMilesAdminRole([]), false);
});
test('custom role allowlist is exact and disallows malformed role IDs', () => {
  assert.equal(hasSkyMilesAdminRole(['111111111111111111'], '111111111111111111'), true);
  assert.equal(hasSkyMilesAdminRole(['111111111111111111'], 'abc,222222222222222222'), false);
  assert.deepEqual([...parseRoleIds('not-a-role')], []);
});
test('SkyMiles commands call canonical website and verify live permissions', () => {
  const src = fs.readFileSync(path.join(__dirname, '../src/index.js'),'utf8');
  for(const command of ['balance','leaderboard','history','add','deduct','set','award-flight']){
    assert.ok(src.includes(".setName('"+command+"')"));
  }
  assert.ok(src.includes('await skyMilesAdminAllowed(interaction)'));
  assert.ok(src.includes('member.roles.cache.map'));
  assert.ok(src.includes("interaction_id:interaction.id"));
  assert.ok(src.includes("skyMiles('award'"));
  assert.ok(src.includes("skyMiles('set'"));
  assert.ok(src.includes("skyMiles('history'"));
});

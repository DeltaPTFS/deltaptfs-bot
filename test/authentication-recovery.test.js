const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

test('OAuth calls retry temporary Roblox rate limits', () => {
  const source = fs.readFileSync('src/authentication-service.js', 'utf8');
  assert.match(source, /response\.status === 429/);
  assert.match(source, /return oauthRequest\(url, options, label, attempt \+ 1\)/);
  assert.match(source, /temporarily rate limited/);
  assert.match(source, /profile\.preferred_username \|\| profile\.name/);
});

test('unlink can repair a Roblox link missing from the selected Discord account', () => {
  const source = fs.readFileSync('src/index.js', 'utf8');
  assert.match(source, /setName\('roblox-username'\)/);
  assert.match(source, /database\.getByRobloxId\(robloxUser\.id\)/);
  assert.match(source, /database\.getByRobloxUsername\(repairUsername\)/);
  assert.match(source, /nicknameUsername/);
  assert.match(source, /moderationAccess\(caller\)/);
  assert.match(source, /Authentication Reset/);
  assert.doesNotMatch(source, /title: 'ℹ️ No Authentication Found'/);
});

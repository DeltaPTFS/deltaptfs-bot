const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

test('/verification-config exposes core and role-mapping administration', () => {
  const source = fs.readFileSync('src/index.js', 'utf8');
  const command = source.slice(
    source.indexOf('const verificationConfigCommand'),
    source.indexOf('function normalizedName'),
  );
  for (const name of ['view', 'set', 'mapping-add', 'mapping-remove']) assert.match(command, new RegExp(`setName\\('${name}'\\)`));
  for (const option of ['verified-role', 'unverified-role', 'roblox-group-id', 'log-channel']) assert.match(command, new RegExp(option));
  assert.match(source, /saveGuildConfig/);
  assert.match(source, /addRoleMapping/);
  assert.match(source, /removeRoleMapping/);
});

test('/verify displays an RP-name modal before beginning OAuth', () => {
  const source = fs.readFileSync('src/index.js', 'utf8');
  assert.match(source, /What would you like your RP name to be\?/);
  assert.match(source, /Confirm this is NOT your real name/);
  assert.match(source, /interaction\.showModal/);
  assert.match(source, /handleVerifyModal/);
  assert.match(source, /Events\.GuildMemberUpdate/);
  assert.match(source, /Verified RP names can only be changed through support/);
});

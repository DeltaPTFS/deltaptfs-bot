const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

test('/authentication-config exposes real role-mapping and staff management options', () => {
  const source = fs.readFileSync('src/index.js', 'utf8');
  const command = source.slice(source.indexOf('const authenticationConfigCommand'), source.indexOf('const authenticationPanelCommand'));
  assert.match(command, /setName\('authentication-config'\)/);
  for (const name of ['status','view','set','mapping-add','mapping-remove'])
    assert.match(command, new RegExp("setName\\('"+name+"'\\)"));
  for (const item of ['authenticated-role','unauthenticated-role','roblox-group-id','log-channel'])
    assert.match(command,new RegExp(item));
  assert.match(source,/handleAuthenticationConfig/);
});

test('/authenticate uses RP-name verification modal and guards changes', () => {
  const source=fs.readFileSync('src/index.js','utf8');
  assert.match(source,/showAuthenticationModal/);
  assert.match(source,/handleAuthenticateModal/);
  assert.match(source,/What would you like your RP name to be\?/);
  assert.match(source,/Confirm this is NOT your real name/);
  assert.match(source,/interaction\.showModal/);
  assert.match(source,/Events\.GuildMemberUpdate/);
  assert.match(source,/Authenticated RP names can only be changed through support/);
});

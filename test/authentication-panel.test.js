const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const {
  AUTHENTICATION_PANEL_CONTENT,
  authenticationPanelPayload,
} = require('../src/authentication-panel');

test('authentication panel is a normal message with the exact content and one primary button', () => {
  const payload = authenticationPanelPayload(null);
  assert.equal(payload.content, AUTHENTICATION_PANEL_CONTENT);
  assert.equal('embeds' in payload, false);
  assert.equal(payload.components.length, 1);
  assert.equal(payload.components[0].components.length, 1);
  assert.deepEqual(payload.components[0].components[0], {
    type: 2, style: 1, custom_id: 'authentication-panel:start', label: 'Authenticate',
  });
  assert.match(payload.content, /Please visit <#1539005082308321331> for assistance\./);
  assert.match(payload.content, /\*\*Verified\*\* role/);
  assert.match(payload.content, /last-name initial must include a period, such as S\./);
});

test('authentication panel resolves existing custom emojis and uses ExternalLink on its button', () => {
  const emoji = (name, id) => ({ name, id, toString: () => `<:${name}:${id}>` });
  const emojis = [emoji('DeltaLogo', '1'), emoji('ExternalLink', '2'), emoji('SkyTeamLogo', '3')];
  const guild = { emojis: { cache: { find: (predicate) => emojis.find(predicate) } } };
  const payload = authenticationPanelPayload(guild);
  assert.match(payload.content, /<:DeltaLogo:1>/);
  assert.match(payload.content, /<:SkyTeamLogo:3>/);
  assert.deepEqual(payload.components[0].components[0].emoji, { id: '2', name: 'ExternalLink' });
});

test('authentication panel command posts through channel.send and reuses the existing flow', () => {
  const source = fs.readFileSync('src/index.js', 'utf8');
  assert.match(source, /setName\('authentication-panel'\)/);
  assert.match(source, /interaction\.channel\.send\(authenticationPanelPayload\(interaction\.guild\)\)/);
  assert.match(source, /interaction\.isButton\(\).*authentication-panel:start/);
  assert.match(source, /await showAuthenticationModal\(interaction\)/);
  assert.match(source, /const result = await authentication\.begin/);
});

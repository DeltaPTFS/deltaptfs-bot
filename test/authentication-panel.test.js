const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const {
  AUTHENTICATION_PANEL_MESSAGES,
  BOTTOM_BANNER_URL,
  MIDDLE_BANNER_URL,
  WELCOME_BANNER_URL,
  authenticationPanelPayloads,
} = require('../src/authentication-panel');

test('authentication panel is five separate normal messages in the requested order', () => {
  const payloads = authenticationPanelPayloads(null);
  assert.equal(payloads.length, 5);
  assert.deepEqual(payloads.map((payload) => payload.content), AUTHENTICATION_PANEL_MESSAGES);
  assert.equal(payloads.some((payload) => 'embeds' in payload), false);
  assert.equal(payloads[0].content, WELCOME_BANNER_URL);
  assert.equal(payloads[1].content, MIDDLE_BANNER_URL);
  assert.ok(payloads.slice(2).every((payload) => payload.content.includes(BOTTOM_BANNER_URL)));
  assert.match(payloads[4].content, /Please visit <#1539005082308321331> for assistance\./);
  assert.match(payloads[4].content, /\*\*Verified\*\* role/);
});

test('only message three has one primary Authenticate button with the custom emoji', () => {
  const emoji = (name, id) => ({ name, id, toString: () => `<:${name}:${id}>` });
  const emojis = [emoji('DeltaLogo', '1'), emoji('ExternalLink', '2'), emoji('SkyTeamLogo', '3')];
  const guild = { emojis: { cache: { find: (predicate) => emojis.find(predicate) } } };
  const payloads = authenticationPanelPayloads(guild);
  assert.equal(payloads.filter((payload) => payload.components).length, 1);
  assert.deepEqual(payloads[2].components[0].components[0], {
    type: 2, style: 1, custom_id: 'authentication-panel:start', label: 'Authenticate',
    emoji: { id: '2', name: 'ExternalLink' },
  });
  assert.match(payloads[2].content, /<:DeltaLogo:1>/);
  assert.match(payloads[2].content, /<:SkyTeamLogo:3>/);
});

test('authentication panel command sends every message and reuses the existing flow', () => {
  const source = fs.readFileSync('src/index.js', 'utf8');
  assert.match(source, /const messages = authenticationPanelPayloads\(interaction\.guild\)/);
  assert.match(source, /for \(const payload of messages\) await interaction\.channel\.send\(payload\)/);
  assert.match(source, /interaction\.isButton\(\).*authentication-panel:start/);
  assert.match(source, /await showAuthenticationModal\(interaction\)/);
  assert.match(source, /const result = await authentication\.begin/);
});

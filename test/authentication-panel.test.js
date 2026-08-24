const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const {
  AUTHENTICATION_PANEL_MESSAGES,
  BOTTOM_BANNER_URL,
  MIDDLE_BANNER_URL,
  PANEL_ATTACHMENTS,
  WELCOME_BANNER_URL,
  authenticationPanelPayloads,
} = require('../src/authentication-panel');

test('authentication panel is five separate normal messages with uploaded banner files', () => {
  const payloads = authenticationPanelPayloads(null);
  assert.equal(payloads.length, 5);
  assert.equal(payloads.some((payload) => 'embeds' in payload), false);
  assert.deepEqual(payloads.map((payload) => payload.files[0]), PANEL_ATTACHMENTS);
  assert.equal(payloads[0].files[0].attachment, WELCOME_BANNER_URL);
  assert.equal(payloads[1].files[0].attachment, MIDDLE_BANNER_URL);
  assert.ok(payloads.slice(2).every((payload) => payload.files[0].attachment === BOTTOM_BANNER_URL));
  assert.equal(payloads.some((payload) => payload.content?.includes('https://cdn.discordapp.com/')), false);
  assert.match(payloads[4].content, /Please visit <#1539005082308321331> for assistance\./);
  assert.match(payloads[4].content, /\*\*Verified\*\* role/);
});

test('only the final message has one primary Authenticate button with the custom emoji', () => {
  const emoji = (name, id) => ({ name, id, toString: () => `<:${name}:${id}>` });
  const emojis = [emoji('DeltaLogo', '1'), emoji('ExternalLink', '2'), emoji('SkyTeamLogo', '3')];
  const guild = { emojis: { cache: { find: (predicate) => emojis.find(predicate) } } };
  const payloads = authenticationPanelPayloads(guild);
  assert.equal(payloads.filter((payload) => payload.components).length, 1);
  assert.deepEqual(payloads[4].components[0].components[0], {
    type: 2, style: 1, custom_id: 'authentication-panel:start', label: 'Authenticate',
    emoji: { id: '2', name: 'ExternalLink' },
  });
  assert.match(payloads[2].content, /<:DeltaLogo:1>/);
  assert.match(payloads[2].content, /<:SkyTeamLogo:3>/);
});

test('authentication panel command sends every message and reuses the existing flow', () => {
  const source = fs.readFileSync('src/index.js', 'utf8');
  assert.match(source, /await interaction\.deferReply\(\{ ephemeral: true \}\)/);
  assert.match(source, /await interaction\.guild\.emojis\.fetch\(\)\.catch/);
  assert.match(source, /const messages = authenticationPanelPayloads\(interaction\.guild\)/);
  assert.match(source, /for \(const payload of messages\) await interaction\.channel\.send\(payload\)/);
  assert.match(source, /Make sure I have View Channel, Send Messages, Embed Links, and Use External Emojis/);
  assert.match(source, /interaction\.isButton\(\).*authentication-panel:start/);
  assert.match(source, /await showAuthenticationModal\(interaction\)/);
  assert.match(source, /const result = await authentication\.begin/);
});

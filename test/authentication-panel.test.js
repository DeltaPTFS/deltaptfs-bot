const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const {
  AUTHENTICATION_PANEL_MESSAGES,
  BOTTOM_BANNER_URL,
  MIDDLE_BANNER_URL,
  WELCOME_BANNER_URL,
  authenticationPanelPayloads,
  loadAuthenticationPanelImages,
} = require('../src/authentication-panel');

const images = { welcome: Buffer.from('welcome'), middle: Buffer.from('middle'), bottom: Buffer.from('bottom') };

test('authentication panel uploads five visible image files without exposing URLs', () => {
  const payloads = authenticationPanelPayloads(null, images);
  assert.equal(payloads.length, 5);
  assert.equal(payloads.some((payload) => 'embeds' in payload), false);
  assert.ok(payloads.every((payload) => payload.files?.length === 1));
  assert.equal(payloads[0].files[0].attachment, images.welcome);
  assert.equal(payloads[1].files[0].attachment, images.middle);
  assert.ok(payloads.slice(2).every((payload) => payload.files[0].attachment === images.bottom));
  assert.equal(payloads.some((payload) => payload.content?.includes('cdn.discordapp.com')), false);
  assert.match(WELCOME_BANNER_URL, /1542761468502474832/);
  assert.match(MIDDLE_BANNER_URL, /1542761993327485008/);
  assert.match(BOTTOM_BANNER_URL, /1542762428389920798/);
  assert.match(payloads[4].content, /Please visit <#1539005082308321331> for assistance\./);
  assert.match(payloads[4].content, /\*\*Verified\*\* role/);
});

test('only the final message has one primary Authenticate button with the custom emoji', () => {
  const emoji = (name, id) => ({ name, id, toString: () => `<:${name}:${id}>` });
  const emojis = [emoji('DeltaLogo', '1'), emoji('ExternalLink', '2'), emoji('SkyTeamLogo', '3')];
  const guild = { emojis: { cache: { find: (predicate) => emojis.find(predicate) } } };
  const payloads = authenticationPanelPayloads(guild, images);
  assert.equal(payloads.filter((payload) => payload.components).length, 1);
  assert.deepEqual(payloads[4].components[0].components[0], {
    type: 2, style: 1, custom_id: 'authentication-panel:start', label: 'Authenticate',
    emoji: { id: '2', name: 'ExternalLink' },
  });
  assert.match(payloads[2].content, /<:DeltaLogo:1>/);
  assert.match(payloads[2].content, /<:SkyTeamLogo:3>/);
});

test('banner URLs are downloaded and validated before Discord upload', async () => {
  const requested = [];
  const fetchImpl = async (url) => {
    requested.push(url);
    return {
      ok: true,
      headers: { get: () => 'image/png' },
      arrayBuffer: async () => Buffer.from(url),
    };
  };
  const downloaded = await loadAuthenticationPanelImages({}, fetchImpl);
  assert.equal(requested.length, 3);
  assert.match(WELCOME_BANNER_URL, /1542761468502474832/);
  assert.match(MIDDLE_BANNER_URL, /1542761993327485008/);
  assert.match(BOTTOM_BANNER_URL, /1542762428389920798/);
  assert.ok(downloaded.welcome.length && downloaded.middle.length && downloaded.bottom.length);
});

test('authentication panel command sends every message and reuses the existing flow', () => {
  const source = fs.readFileSync('src/index.js', 'utf8');
  assert.match(source, /await interaction\.deferReply\(\{ ephemeral: true \}\)/);
  assert.match(source, /await interaction\.guild\.emojis\.fetch\(\)\.catch/);
  assert.match(source, /loadAuthenticationPanelImages/);
  assert.match(source, /const messages = authenticationPanelPayloads\(interaction\.guild, images\)/);
  assert.match(source, /for \(const payload of messages\) await interaction\.channel\.send\(payload\)/);
  assert.match(source, /View Channel, Send Messages, Attach Files, and Use External Emojis/);
  assert.match(source, /interaction\.isButton\(\).*authentication-panel:start/);
  assert.match(source, /await showAuthenticationModal\(interaction\)/);
  assert.match(source, /const result = await authentication\.begin/);
});

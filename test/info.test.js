const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { INFO_MESSAGES, infoMessagePayload, missingBannerEnvironmentKeys } = require('../src/info');

test('info sequence combines every section with its labeled banner URL variable', () => {
  assert.equal(INFO_MESSAGES.length, 6);
  assert.ok(INFO_MESSAGES.every(({ content, banner, bannerEnv }) => content && banner && bannerEnv));
  assert.ok(INFO_MESSAGES.every(({ content }) => !content?.includes('MESSAGE DIVIDER')));
  assert.ok(INFO_MESSAGES.filter(({ content }) => content).every(({ content }) => content.length <= 2000));
  assert.ok(INFO_MESSAGES.every(({ content }) => !/:[A-Za-z][A-Za-z0-9_-]*:/.test(content)));
  assert.deepEqual(INFO_MESSAGES.map(({ content }) => content.split('\n')[0]), [
    '# ℹ️ Welcome to Delta Air Lines',
    '# 📜 Community Rules',
    '# 🔔 Notification Roles',
    '# 🎉 Community Events',
    '# ✈️ Flight Operations',
    '# 🛟 Need Assistance?',
  ]);
  assert.deepEqual(INFO_MESSAGES.map(({ banner }) => banner), [
    'welcome',
    'community-rules',
    'notifications',
    'events',
    'flight-operations',
    'skyteam',
  ]);
  assert.deepEqual(INFO_MESSAGES.map(({ bannerEnv }) => bannerEnv), [
    'INFO_WELCOME_BANNER_URL',
    'INFO_RULES_BANNER_URL',
    'INFO_NOTIFICATIONS_BANNER_URL',
    'INFO_EVENTS_BANNER_URL',
    'INFO_FLIGHT_OPERATIONS_BANNER_URL',
    'INFO_ASSISTANCE_BANNER_URL',
  ]);
});

test('info payload places each banner inside the same Discord message as an embed image', () => {
  const environment = Object.fromEntries(
    INFO_MESSAGES.map((message) => [message.bannerEnv, `https://cdn.example.com/${message.banner}.png`]),
  );

  for (const message of INFO_MESSAGES) {
    const payload = infoMessagePayload(message, environment);
    assert.equal(payload.content, message.content);
    assert.deepEqual(payload.embeds, [{ image: { url: `https://cdn.example.com/${message.banner}.png` } }]);
    assert.equal(payload.files, undefined);
  }
});

test('an uploaded banner takes priority over its configured banner URL', () => {
  const message = INFO_MESSAGES[0];
  const payload = infoMessagePayload(
    message,
    { [message.bannerEnv]: 'https://cdn.example.com/configured.png' },
    'https://cdn.discordapp.com/attachments/uploaded.png',
  );

  assert.deepEqual(payload.embeds, [{
    image: { url: 'https://cdn.discordapp.com/attachments/uploaded.png' },
  }]);
});

test('info command posts standalone channel messages', () => {
  const entrypoint = fs.readFileSync('src/index.js', 'utf8');
  const handler = entrypoint.slice(
    entrypoint.indexOf('async function handleInfo'),
    entrypoint.indexOf('client.on(Events.InteractionCreate'),
  );
  assert.match(handler, /interaction\.channel\.send/);
  assert.match(handler, /infoMessagePayload/);
  assert.match(handler, /interaction\.options\.getAttachment/);
  assert.doesNotMatch(handler, /interaction\.followUp/);
  assert.doesNotMatch(handler, /AttachmentBuilder/);
});

test('missing banner variables are reported without blocking info posting', () => {
  assert.deepEqual(missingBannerEnvironmentKeys({}), [
    'INFO_WELCOME_BANNER_URL',
    'INFO_RULES_BANNER_URL',
    'INFO_NOTIFICATIONS_BANNER_URL',
    'INFO_EVENTS_BANNER_URL',
    'INFO_FLIGHT_OPERATIONS_BANNER_URL',
    'INFO_ASSISTANCE_BANNER_URL',
  ]);
});

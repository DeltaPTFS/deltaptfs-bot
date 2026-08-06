const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const {
  INFO_MESSAGES,
  DELTA_BLUE,
  infoMessagePayload,
  missingBannerEnvironmentKeys,
  resolveInfoEmojis,
} = require('../src/info');

test('info sequence combines every section with its labeled banner URL variable', () => {
  assert.equal(INFO_MESSAGES.length, 6);
  assert.ok(INFO_MESSAGES.every(({ content, banner, bannerEnv }) => content && banner && bannerEnv));
  assert.ok(INFO_MESSAGES.every(({ content }) => !content?.includes('MESSAGE DIVIDER')));
  assert.ok(INFO_MESSAGES.filter(({ content }) => content).every(({ content }) => content.length <= 2000));
  assert.ok(INFO_MESSAGES.every(({ content }) => !/Delta Air Lines(?! PTFS)/.test(content)));
  assert.deepEqual(INFO_MESSAGES.map(({ content }) => content.split('\n')[0]), [
    '# :information: Welcome to Delta Air Lines PTFS',
    '# :rules: Community Rules',
    '# :roles: Notification Roles',
    '# :events: Community Events',
    '# :support: Flight Operations',
    '# :feedback: Need Assistance?',
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

test('info payload places the banner and text in one Delta-blue embed', () => {
  const environment = Object.fromEntries(
    INFO_MESSAGES.map((message) => [message.bannerEnv, `https://cdn.example.com/${message.banner}.png`]),
  );

  for (const message of INFO_MESSAGES) {
    const payload = infoMessagePayload(message, environment);
    assert.equal(payload.content, undefined);
    assert.equal(payload.embeds.length, 1);
    assert.equal(payload.embeds[0].color, DELTA_BLUE);
    assert.ok(payload.embeds[0].title);
    assert.deepEqual(payload.embeds[0].image, { url: `https://cdn.example.com/${message.banner}.png` });
    assert.ok(!/:(information|rules|roles|events|support|feedback|skyteamlogo):/.test(
      `${payload.embeds[0].title} ${payload.embeds[0].description}`,
    ));
    assert.equal(payload.files, undefined);
  }
});

test('info aliases resolve to server emoji IDs and have Unicode fallbacks', () => {
  const guild = {
    emojis: {
      cache: [
        { name: 'support', toString: () => '<:support:123456789012345678>' },
        { name: 'skyteamlogo', toString: () => '<:skyteamlogo:987654321098765432>' },
      ],
    },
  };

  assert.equal(
    resolveInfoEmojis(':support: Flight Operations :skyteamlogo:', guild),
    '<:support:123456789012345678> Flight Operations <:skyteamlogo:987654321098765432>',
  );
  assert.equal(resolveInfoEmojis(':rules: Rules :feedback:'), '📜 Rules 🛟');
});

test('an uploaded banner takes priority over its configured banner URL', () => {
  const message = INFO_MESSAGES[0];
  const payload = infoMessagePayload(
    message,
    { [message.bannerEnv]: 'https://cdn.example.com/configured.png' },
    'https://cdn.discordapp.com/attachments/uploaded.png',
  );

  assert.deepEqual(payload.embeds[0], {
    color: DELTA_BLUE,
    title: 'ℹ️ Welcome to Delta Air Lines PTFS',
    description: payload.embeds[0].description,
    image: { url: 'https://cdn.discordapp.com/attachments/uploaded.png' },
  });
});

test('info payload still posts a formatted content embed when no banner is supplied', () => {
  const payload = infoMessagePayload(INFO_MESSAGES[0], {});

  assert.equal(payload.embeds.length, 1);
  assert.equal(payload.embeds[0].color, DELTA_BLUE);
  assert.equal(payload.embeds[0].title, 'ℹ️ Welcome to Delta Air Lines PTFS');
  assert.equal(payload.embeds[0].image, undefined);
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

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { INFO_MESSAGES, bannerAttachment } = require('../src/info');

test('info sequence combines every section with its labeled banner', () => {
  assert.equal(INFO_MESSAGES.length, 6);
  assert.ok(INFO_MESSAGES.every(({ content, banner }) => content && banner));
  assert.ok(INFO_MESSAGES.every(({ content }) => !content?.includes('MESSAGE DIVIDER')));
  assert.ok(INFO_MESSAGES.filter(({ content }) => content).every(({ content }) => content.length <= 2000));
  assert.deepEqual(INFO_MESSAGES.map(({ banner }) => banner), [
    'welcome.png',
    'community-rules.png',
    'notifications.png',
    'events.png',
    'flight-operations.png',
    'skyteam.png',
  ]);
  for (const { banner } of INFO_MESSAGES) {
    const attachment = bannerAttachment(banner);
    assert.equal(attachment.name, banner);
    assert.ok(Buffer.isBuffer(attachment.data));
    assert.ok(attachment.data.length > 0, `empty banner ${banner}`);
    assert.equal(attachment.data.subarray(1, 4).toString('ascii'), 'PNG');
  }
});

test('info command posts standalone channel messages', () => {
  const entrypoint = fs.readFileSync('src/index.js', 'utf8');
  const handler = entrypoint.slice(
    entrypoint.indexOf('async function handleInfo'),
    entrypoint.indexOf('client.on(Events.InteractionCreate'),
  );
  assert.match(handler, /interaction\.channel\.send/);
  assert.doesNotMatch(handler, /interaction\.followUp/);
});

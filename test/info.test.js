const test = require('node:test');
const assert = require('node:assert/strict');
const { INFO_MESSAGES, bannerAttachment } = require('../src/info');

test('info sequence keeps every section and divider banner separate', () => {
  assert.equal(INFO_MESSAGES.length, 11);
  assert.equal(INFO_MESSAGES.filter(({ content }) => content).length, 6);
  assert.equal(INFO_MESSAGES.filter(({ banner }) => banner).length, 5);
  assert.ok(INFO_MESSAGES.every((message, index) =>
    index % 2 === 0 ? Boolean(message.content) : Boolean(message.banner)));
  assert.ok(INFO_MESSAGES.every(({ content }) => !content?.includes('MESSAGE DIVIDER')));
  assert.ok(INFO_MESSAGES.filter(({ content }) => content).every(({ content }) => content.length <= 2000));
  for (const { banner } of INFO_MESSAGES.filter(({ banner }) => banner)) {
    const attachment = bannerAttachment(banner);
    assert.equal(attachment.name, banner);
    assert.ok(Buffer.isBuffer(attachment.data));
    assert.ok(attachment.data.length > 0, `empty banner ${banner}`);
    assert.equal(attachment.data.subarray(1, 4).toString('ascii'), 'PNG');
  }
});

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { buildLinkButtonMessage, parseHexColor, reactionInput, reactionKey } = require('../src/message-tools');

test('custom link button accepts HTTPS, hex colors, and emojis', () => {
  const payload = buildLinkButtonMessage({
    text: 'Apply for Flight Operations', label: 'Apply', url: 'https://example.com/apply', hex: '#071D49', emoji: '🔗',
  });
  assert.equal(payload.embeds[0].color, 0x071D49);
  assert.deepEqual(payload.components[0].components[0], {
    type: 2, style: 5, label: 'Apply', url: 'https://example.com/apply', emoji: { name: '🔗' },
  });
  assert.throws(() => buildLinkButtonMessage({ text: 'x', label: 'x', url: 'http://example.com' }), /HTTPS/);
  assert.throws(() => parseHexColor('#12345'), /six hexadecimal/);
});

test('reaction roles normalize Unicode and custom emoji identifiers', () => {
  assert.deepEqual(reactionInput('✅'), { emoji: { name: '✅' }, key: 'unicode:✅', reactable: '✅' });
  const custom = reactionInput('<:DeltaLogo:123456789012345678>');
  assert.equal(custom.key, 'custom:123456789012345678');
  assert.equal(reactionKey({ id: '123456789012345678', name: 'DeltaLogo' }), custom.key);
});

test('slash commands and reaction event handlers are registered', () => {
  const source = fs.readFileSync('src/index.js', 'utf8');
  for (const command of ['create-button', 'reaction-role']) assert.match(source, new RegExp(`setName\\('${command}'\\)`));
  assert.match(source, /Events\.MessageReactionAdd/);
  assert.match(source, /Events\.MessageReactionRemove/);
  assert.match(source, /database\.addReactionRole/);
  assert.match(source, /database\.removeReactionRole/);
});

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { AUTHENTICATION_WELCOME_MESSAGE, newsletterContent } = require('../src/member-messages');

test('authentication welcome DM uses the requested normal-message copy and custom emojis', () => {
  assert.match(AUTHENTICATION_WELCOME_MESSAGE, /^<:Heart:1541639571266080819> \*\*Welcome to Delta\.\*\*/);
  assert.match(AUTHENTICATION_WELCOME_MESSAGE, /P\.O\. Box 20980 Department 980 Atlanta, GA 30320-2980/);
  assert.match(AUTHENTICATION_WELCOME_MESSAGE, /<:WingPinLogo:1540927847709802607>/);
  assert.match(AUTHENTICATION_WELCOME_MESSAGE, /a Member of SkyTeam Alliance/);
});

test('newsletter content is trimmed and limited to Discord message length', () => {
  assert.equal(newsletterContent('  Delta update  '), 'Delta update');
  assert.throws(() => newsletterContent('   '), /cannot be empty/);
  assert.throws(() => newsletterContent('x'.repeat(2001)), /2,000/);
});

test('newsletter command is founder-only, DMs non-bot members, and reports delivery results', () => {
  const source = fs.readFileSync('src/index.js', 'utf8');
  assert.match(source, /setName\('newsletter'\)/);
  assert.match(source, /caller\.roles\.cache\.has\(config\.moderationFounderRoleId\)/);
  assert.match(source, /await member\.send\(\{ content, allowedMentions: \{ parse: \[\] \} \}\)/);
  assert.match(source, /Newsletter Delivery Complete/);
  assert.match(source, /activeNewsletters/);
});

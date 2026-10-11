const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { AUTHENTICATION_WELCOME_MESSAGE, DELTA_WEBSITE_URL, MAIN_DELTA_GUILD_ID, newMemberWelcomeMessage, sendNewMemberWelcome, newsletterContent } = require('../src/member-messages');

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

test('new Delta member welcome contains website, roleplay instructions and correct heading', () => {
  const content = newMemberWelcomeMessage();
  assert.match(content, /Welcome Aboard Delta Air Lines/);
  assert.match(content, /Keep Climbing, Delta Air Lines/);
  assert.match(content, /server verification/);
  assert.match(content, /SkyMiles/);
  assert.match(content, /flight schedules, applications, and SkyMiles/);
  assert.ok(content.includes(DELTA_WEBSITE_URL));
  assert.ok(content.length < 2000);
  assert.equal(MAIN_DELTA_GUILD_ID, '1538738611988467782');
});

test('sendNewMemberWelcome sends exactly one DM with no mass pings to main guild members', async () => {
  const sent = [];
  const member = {
    id: 'member1',
    user: { bot: false },
    guild: { id: MAIN_DELTA_GUILD_ID },
    async send(payload) { sent.push(payload); },
  };
  assert.equal(await sendNewMemberWelcome(member), true);
  assert.equal(sent.length, 1);
  assert.match(sent[0].content, /https:\/\/roblox-delta-web\.vercel\.app/);
  assert.deepEqual(sent[0].allowedMentions, { parse: [] });
});

test('welcome skips bots and members joining a different server', async () => {
  let count = 0;
  const member = {
    id: 'member2',
    user: { bot: false },
    guild: { id: 'another-guild' },
    async send() { count++; },
  };
  assert.equal(await sendNewMemberWelcome(member), false);
  member.guild.id = MAIN_DELTA_GUILD_ID;
  member.user.bot = true;
  assert.equal(await sendNewMemberWelcome(member), false);
  assert.equal(count, 0);
});

test('disabled DMs are logged without interrupting member join handling', async () => {
  const logs = [];
  const member = {
    id: 'member3',
    user: { bot: false },
    guild: { id: MAIN_DELTA_GUILD_ID },
    async send() { throw new Error('Cannot send messages to this user'); },
  };
  assert.equal(await sendNewMemberWelcome(member, { logger: { warn: (s) => logs.push(s) } }), false);
  assert.equal(logs.length, 1);
  assert.match(logs[0], /member3/);
});

test('guildMemberAdd event invokes welcome without delaying role or logging workflows', () => {
  const source = fs.readFileSync('src/index.js', 'utf8');
  assert.match(source, /sendNewMemberWelcome\(member,/);
  assert.match(source, /void sendNewMemberWelcome/);
  assert.match(source, /Member Joined/);
});

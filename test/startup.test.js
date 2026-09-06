const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

test('privileged message-content intent is opt-in so Discord can start normally', () => {
  const source = fs.readFileSync('src/index.js', 'utf8');
  assert.match(source, /ENABLE_MESSAGE_CONTENT_INTENT === 'true'/);
  assert.match(source, /gatewayIntents\.push\(GatewayIntentBits\.MessageContent\)/);
  assert.doesNotMatch(source, /GuildMessageReactions,\s*GatewayIntentBits\.MessageContent/);
});

test('privileged guild-members intent is opt-in and failed logins retry without exiting', () => {
  const source = fs.readFileSync('src/index.js', 'utf8');
  assert.match(source, /ENABLE_GUILD_MEMBERS_INTENT === 'true'/);
  assert.match(source, /gatewayIntents\.push\(GatewayIntentBits\.GuildMembers\)/);
  assert.match(source, /setTimeout\(connectDiscord, 15_000\)/);
  assert.doesNotMatch(source, /Discord login failed[\s\S]{0,300}process\.exit/);
});

test('gateway failures update health state without an artificial login deadline', () => {
  const source = fs.readFileSync('src/index.js', 'utf8');
  assert.match(source, /Events\.ShardError/);
  assert.match(source, /Events\.Invalidated/);
  assert.match(source, /await client\.login\(token\)/);
  assert.doesNotMatch(source, /Discord login timed out/);
  assert.doesNotMatch(source, /discordStartupTimeout/);
});

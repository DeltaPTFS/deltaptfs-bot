const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

test('message content and guild member intents are enabled for logging and join roles', () => {
  const source = fs.readFileSync('src/index.js', 'utf8');
  assert.match(source, /GatewayIntentBits\.GuildMembers/);
  assert.match(source, /GatewayIntentBits\.MessageContent/);
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

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

test('privileged message-content intent is opt-in so Discord can start normally', () => {
  const source = fs.readFileSync('src/index.js', 'utf8');
  assert.match(source, /ENABLE_MESSAGE_CONTENT_INTENT === 'true'/);
  assert.match(source, /gatewayIntents\.push\(GatewayIntentBits\.MessageContent\)/);
  assert.doesNotMatch(source, /GuildMessageReactions,\s*GatewayIntentBits\.MessageContent/);
});

test('gateway failures update health state instead of staying on starting forever', () => {
  const source = fs.readFileSync('src/index.js', 'utf8');
  assert.match(source, /Events\.ShardError/);
  assert.match(source, /Events\.Invalidated/);
  assert.match(source, /did not become ready within 45 seconds/);
});

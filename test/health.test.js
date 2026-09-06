const test = require('node:test');
const assert = require('node:assert/strict');
const { startHealthServer } = require('../src/health');

test('health server exposes startup and Discord-ready states', async (context) => {
  const health = startHealthServer({ port: 0 });
  context.after(() => new Promise((resolve) => health.server.close(resolve)));
  await new Promise((resolve) => health.server.once('listening', resolve));
  const { port } = health.server.address();

  const startup = await fetch(`http://127.0.0.1:${port}/health`);
  assert.equal(startup.status, 503);
  assert.equal((await startup.json()).status, 'starting');

  const root = await fetch(`http://127.0.0.1:${port}/`);
  assert.equal(root.status, 200);

  health.markReady();
  const ready = await fetch(`http://127.0.0.1:${port}/health`);
  assert.equal(ready.status, 200);
  assert.equal((await ready.json()).discordReady, true);
});

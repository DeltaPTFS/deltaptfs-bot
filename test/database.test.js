const test = require('node:test');
const assert = require('node:assert/strict');
const { createDatabase } = require('../src/database');

test('PostgreSQL initialization creates verification, session, and audit tables', async () => {
  const calls = [];
  class Pool {
    constructor(options) { calls.push(options); }
    async query(sql, values) { calls.push([sql, values]); return { rows: [] }; }
    async end() {}
  }
  const database = createDatabase('postgresql://example', Pool);
  await database.init();
  const schema = calls[1][0];
  assert.match(schema, /CREATE TABLE IF NOT EXISTS verifications/);
  assert.match(schema, /roblox_user_id BIGINT UNIQUE NOT NULL/);
  assert.match(schema, /CREATE TABLE IF NOT EXISTS verification_sessions/);
  assert.match(schema, /CREATE TABLE IF NOT EXISTS role_update_logs/);
  assert.match(schema, /CREATE TABLE IF NOT EXISTS guild_verification_config/);
  assert.match(schema, /CREATE TABLE IF NOT EXISTS guild_role_mappings/);
  assert.match(schema, /rp_name TEXT/);
});

test('database methods fail safely when DATABASE_URL is absent', async () => {
  const database = createDatabase();
  assert.equal(database.configured, false);
  await assert.rejects(database.getByDiscordId('1'), /DATABASE_URL/);
});

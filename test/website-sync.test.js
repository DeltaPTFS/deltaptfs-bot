'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { Readable } = require('node:stream');
const { validWebsiteSignature, createWebsiteSyncHandler } = require('../src/website-sync');
const { memberRow } = require('../src/roster-sync');

const secret = 'strong-test-secret-for-delta-air-lines-123456';
const timestamp = '1791645600';
function headers(raw) {
  const signature = crypto.createHmac('sha256', secret).update(timestamp + '.').update(raw).digest('hex');
  return { 'x-website-timestamp': timestamp, 'x-website-signature': 'sha256=' + signature };
}
test('HMAC verifies the body and denies tampering and stale timestamps', () => {
  const raw = Buffer.from('{"event_type":"form_response"}');
  assert.equal(validWebsiteSignature(raw, headers(raw), secret, Number(timestamp)), true);
  assert.equal(validWebsiteSignature(Buffer.from('{}'), headers(raw), secret, Number(timestamp)), false);
  assert.equal(validWebsiteSignature(raw, headers(raw), secret, Number(timestamp) + 301), false);
});

test('idempotent website receiver acknowledges a signed event', async () => {
  const event = { event_id: 'b3a0df68-20e4-44ff-a77d-5682154bb199',
    event_type: 'form_response', payload: { discord_user_id: '1538738611988467782' } };
  const raw = Buffer.from(JSON.stringify(event));
  let recorded = null;
  const handler = createWebsiteSyncHandler({ secret, sync: async (item) => {
    recorded = item;
    return { duplicate: false };
  } });
  const req = Readable.from([raw]);
  req.method = 'POST';
  req.url = '/internal/website-sync';
  req.headers = headers(raw);
  let code;
  let content;
  const res = { writeHead(status) { code = status; }, end(text) { content = JSON.parse(text); } };
  assert.equal(await handler(req, res), true);
  assert.equal(code, 200);
  assert.equal(content.status, 'ok');
  assert.deepEqual(recorded, event);
});

test('roster row includes both guild identifier and role IDs', () => {
  const roles = new Map([['guild', { id: 'guild', name: '@everyone' }],
    ['staff', { id: 'staff', name: 'Pilot' }]]);
  roles.filter = function(fn) { return new Map(Array.from(this).filter(([,role])=>fn(role))); };
  const guild = { id: 'guild', name: 'Delta Crew' };
  const member = { id: '123', displayName: 'Captain', user: { username: 'captain' },
    guild, roles: { cache: roles } };
  const result = memberRow(member);
  assert.equal(result.guildName, 'Delta Crew');
  assert.deepEqual(result.roleIds, ['staff']);
});

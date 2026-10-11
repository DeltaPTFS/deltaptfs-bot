'use strict';
const crypto = require('node:crypto');
const { sheetsRequest } = require('./sheets');

const TYPES = new Set(['register_member', 'update_member', 'record_transaction', 'form_upsert', 'form_response', 'flight_upsert', 'discord_roster']);
const UUID = /^[0-9a-f]{8}-[0-9a-f-]{27,36}$/i;

function validWebsiteSignature(rawBody, headers, secret, now = Math.floor(Date.now() / 1000)) {
  if (!secret || secret.length < 32) return false;
  const timestamp = String(headers['x-website-timestamp'] || '');
  const value = String(headers['x-website-signature'] || '').replace(/^sha256=/, '');
  if (!/^\d{10}$/.test(timestamp) || Math.abs(now - Number(timestamp)) > 300 || !/^[0-9a-f]{64}$/i.test(value)) return false;
  const expected = crypto.createHmac('sha256', secret).update(timestamp + '.').update(rawBody).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(value, 'hex'), Buffer.from(expected, 'hex'));
}

function createWebsiteSyncHandler(options = {}) {
  const secret = options.secret ?? process.env.WEBSITE_SYNC_SECRET ?? process.env.DELTA_BOT_INTERNAL_SECRET;
  const sync = options.sync ?? ((event) => sheetsRequest('syncEvent', { event }));
  return async (req, res) => {
    if (req.url?.split('?')[0] !== '/internal/website-sync') return false;
    const reply = (code, data) => {
      res.writeHead(code, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      res.end(JSON.stringify(data));
      return true;
    };
    if (req.method !== 'POST') return reply(405, { error: 'Method not allowed' });
    let size = 0;
    const chunks = [];
    for await (const chunk of req) {
      size += chunk.length;
      if (size > 262144) return reply(413, { error: 'Payload too large' });
      chunks.push(chunk);
    }
    const raw = Buffer.concat(chunks);
    if (!validWebsiteSignature(raw, req.headers, secret)) return reply(401, { error: 'Invalid signature' });
    let event;
    try {
      event = JSON.parse(raw.toString('utf8'));
      if (!event || !UUID.test(String(event.event_id)) || !TYPES.has(event.event_type)
          || !event.payload || typeof event.payload !== 'object' || Array.isArray(event.payload)) throw Error('Invalid event');
    } catch {
      return reply(422, { error: 'Invalid sync event' });
    }
    try {
      const outcome = await sync(event);
      return reply(200, { status: outcome.duplicate ? 'duplicate' : 'ok', event_id: event.event_id });
    } catch (error) {
      console.error('Website to Google Sheets sync failed:', error);
      return reply(502, { error: 'Sheet sync unavailable; the website will retry' });
    }
  };
}

module.exports = { createWebsiteSyncHandler, validWebsiteSignature };

const test = require('node:test');
const assert = require('node:assert/strict');

process.env.GOOGLE_SHEETS_WEBHOOK_URL = 'https://example.test/exec';
process.env.GOOGLE_SHEETS_WEBHOOK_SECRET = 'test-secret';

const { awardMiles, getBalance, isSheetsConfigured } = require('../src/sheets');

test('Sheets client sends authenticated ledger requests', async (context) => {
  const requests = [];
  context.mock.method(globalThis, 'fetch', async (url, options) => {
    requests.push({ url, options });
    return {
      ok: true,
      json: async () => ({ ok: true, balance: 1250 }),
    };
  });

  assert.equal(isSheetsConfigured(), true);
  const result = await awardMiles({
    userId: '123',
    displayName: 'Passenger',
    miles: 250,
    flightId: 'DAL100',
    reason: 'Completed flight',
    awardedById: '456',
  });
  assert.equal(result.balance, 1250);
  assert.equal(requests[0].url, 'https://example.test/exec');
  assert.deepEqual(JSON.parse(requests[0].options.body), {
    action: 'award',
    secret: 'test-secret',
    userId: '123',
    displayName: 'Passenger',
    miles: 250,
    flightId: 'DAL100',
    reason: 'Completed flight',
    awardedById: '456',
  });

  await getBalance('123');
  assert.equal(JSON.parse(requests[1].options.body).action, 'balance');
});

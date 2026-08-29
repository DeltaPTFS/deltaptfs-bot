const webhookUrl = process.env.GOOGLE_SHEETS_WEBHOOK_URL;
const webhookSecret = process.env.GOOGLE_SHEETS_WEBHOOK_SECRET;

function isSheetsConfigured() {
  return Boolean(webhookUrl && webhookSecret);
}

async function sheetsRequest(action, data = {}) {
  if (!isSheetsConfigured()) {
    throw new Error('Google Sheets is not configured');
  }

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, secret: webhookSecret, ...data }),
    redirect: 'follow',
  });
  if (!response.ok) throw new Error(`Google Sheets returned HTTP ${response.status}`);

  const result = await response.json();
  if (!result.ok) throw new Error(result.error || 'Google Sheets request failed');
  return result;
}

function getBalance(userId) {
  return sheetsRequest('balance', { userId });
}

function getLeaderboard(limit = 10) {
  return sheetsRequest('leaderboard', { limit });
}

function awardMiles(entry) {
  return sheetsRequest('award', entry);
}

module.exports = {
  awardMiles,
  getBalance,
  getLeaderboard,
  isSheetsConfigured,
  sheetsRequest,
};

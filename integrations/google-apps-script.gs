const SHEET_NAME = 'SkyMiles Ledger';
const HEADERS = [
  'Timestamp',
  'Discord User ID',
  'Display Name',
  'Miles',
  'Flight ID',
  'Reason',
  'Awarded By ID',
];

function doPost(event) {
  try {
    const request = JSON.parse(event.postData.contents);
    const secret = PropertiesService.getScriptProperties().getProperty('WEBHOOK_SECRET');
    if (!secret || request.secret !== secret) return jsonResponse({ ok: false, error: 'Unauthorized' });

    const sheet = getLedgerSheet();
    if (request.action === 'award') return award(sheet, request);
    if (request.action === 'balance') return balance(sheet, request.userId);
    if (request.action === 'leaderboard') return leaderboard(sheet, request.limit);
    return jsonResponse({ ok: false, error: 'Unknown action' });
  } catch (error) {
    return jsonResponse({ ok: false, error: error.message });
  }
}

function getLedgerSheet() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = spreadsheet.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(SHEET_NAME);
    sheet.appendRow(HEADERS);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function award(sheet, request) {
  const miles = Number(request.miles);
  if (!request.userId || !Number.isSafeInteger(miles) || miles === 0) {
    return jsonResponse({ ok: false, error: 'A user and a non-zero whole-number award are required' });
  }
  sheet.appendRow([
    new Date(),
    String(request.userId),
    String(request.displayName || ''),
    miles,
    String(request.flightId || ''),
    String(request.reason || ''),
    String(request.awardedById || ''),
  ]);
  SpreadsheetApp.flush();
  return balance(sheet, request.userId);
}

function ledgerTotals(sheet) {
  if (sheet.getLastRow() < 2) return {};
  const rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, HEADERS.length).getValues();
  return rows.reduce((totals, row) => {
    const id = String(row[1]);
    if (!id) return totals;
    const current = totals[id] || { userId: id, displayName: '', balance: 0 };
    current.displayName = String(row[2] || current.displayName);
    current.balance += Number(row[3]) || 0;
    totals[id] = current;
    return totals;
  }, {});
}

function balance(sheet, userId) {
  const entry = ledgerTotals(sheet)[String(userId)] || {
    userId: String(userId),
    displayName: '',
    balance: 0,
  };
  return jsonResponse({ ok: true, ...entry });
}

function leaderboard(sheet, requestedLimit) {
  const limit = Math.min(Math.max(Number(requestedLimit) || 10, 1), 25);
  const leaders = Object.values(ledgerTotals(sheet))
    .sort((left, right) => right.balance - left.balance)
    .slice(0, limit);
  return jsonResponse({ ok: true, leaders });
}

function jsonResponse(value) {
  return ContentService
    .createTextOutput(JSON.stringify(value))
    .setMimeType(ContentService.MimeType.JSON);
}

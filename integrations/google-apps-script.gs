/**
 * Delta Air Lines Roblox roleplay — Google Sheets tracking bridge.
 * Bind this script to the Delta Air Lines tracking workbook (Extensions > Apps Script).
 * Script property WEBHOOK_SECRET: same high-entropy secret as GOOGLE_SHEETS_WEBHOOK_SECRET.
 * Deploy as a web app; do not publish the secret or give editors access to credentials.
 * Website Postgres owns SkyMiles balances; this spreadsheet mirrors events.
 */
const SCHEMAS = {
  'Members': ['Discord User ID','Discord Username','Display Name','Roblox User ID','Roblox Username','SkyMiles Number','Membership Tier','SkyMiles Balance','MQP','Segments','Status','Last Synced (UTC)','Source'],
  'Discord Roles': ['Discord User ID','Display Name','Server ID','Server Name','Role IDs','Role Names','Last Verified (UTC)'],
  'Hosted Flights': ['Flight ID','Flight Number','Departure','Destination','Aircraft','Gate','Start (UTC)','End (UTC)','Host Discord ID','Status','Fillout Link','Last Updated (UTC)'],
  'Flight Fillouts': ['Submission ID','Flight ID','Discord User ID','Display Name','Role(s)','Requested Position','Notes','Submitted (UTC)'],
  'Forms': ['Form ID','Slug','Title','Status','Allowed Guild/Role IDs','Fields JSON','Last Updated (UTC)'],
  'Form Responses': ['Response ID','Form ID','Form Title','Discord User ID','Display Name','Flight ID','Answers JSON','Submitted (UTC)'],
  'SkyMiles Ledger': ['Timestamp','Discord User ID','Display Name','Miles','Flight ID','Reason','Awarded By ID','Transaction ID','Balance After','Event ID'],
  'Sync Events': ['Event ID','Event Type','Recorded At (UTC)']
};
function response(value) {
  return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);
}
function clean(value) {
  if (value === null || value === undefined) return '';
  let text = typeof value === 'object' ? JSON.stringify(value) : String(value);
  if (/^[\s]*[=+@\-]/.test(text)) text = "'" + text;
  return text.slice(0, 48000);
}
function getSheet(name) {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  if (!SCHEMAS[name]) throw Error('Unrecognized tab: ' + name);
  let sheet = spreadsheet.getSheetByName(name);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(name);
    sheet.getRange(1, 1, 1, SCHEMAS[name].length).setValues([SCHEMAS[name]]);
    sheet.setFrozenRows(1);
  }
  return sheet;
}
function rows(sheet) {
  if (sheet.getLastRow() < 2) return [];
  return sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues();
}
function upsert(name, keyColumns, values) {
  const sheet = getSheet(name);
  const data = rows(sheet);
  const index = data.findIndex(row => keyColumns.every(index => String(row[index]) === String(values[index])));
  const safe = values.map(clean);
  if (index >= 0) sheet.getRange(index + 2, 1, 1, safe.length).setValues([safe]);
  else sheet.appendRow(safe);
}
function memberEvent(event) {
  const p = event.payload;
  upsert('Members', [0], [
    p.discord_user_id, p.discord_username, p.registered_by_name === p.discord_username ? p.rp_name : (p.rp_name || p.discord_username),
    p.roblox_user_id, p.roblox_username, p.skymiles_number,
    p.membership_tier, p.miles_balance, p.mqp, p.segments, p.registration_status,
    p.timestamp || new Date().toISOString(), 'Website'
  ]);
}
function transactionEvent(event) {
  const p=event.payload;
  upsert('SkyMiles Ledger', [9], [
    p.timestamp, p.discord_user_id, p.display_name, p.miles_change,
    p.flight_or_event_id, p.reason, p.awarded_by_discord_id,
    p.transaction_id, p.balance_after, event.event_id
  ]);
}
function flightEvent(event) {
  const p=event.payload;
  const site=PropertiesService.getScriptProperties().getProperty('WEBSITE_URL') || '';
  upsert('Hosted Flights', [0], [
    p.flight_id, p.flight_number, p.departure, p.destination, p.aircraft, p.gate,
    p.starts_at, p.ends_at, p.host_discord_id || '', p.status,
    site ? site.replace(/\/$/, '') + '/forms/flight-crew-fillout?flight=' + p.flight_id : '',
    new Date().toISOString()
  ]);
}
function formEvent(event) {
  const p=event.payload;
  upsert('Forms', [0], [
    p.form_id, p.slug, p.title, p.status,
    p.allowed_roles, p.questions, p.updated_at
  ]);
}
function formResponseEvent(event) {
  const p=event.payload;
  upsert('Form Responses', [0], [
    p.response_id, p.form_id, p.form_title, p.discord_user_id, p.discord_display_name,
    p.flight_id, p.answers, p.submitted_at
  ]);
  if (p.is_flight_form && p.flight_id) {
    const a=p.answers || {};
    upsert('Flight Fillouts', [0], [
      p.response_id, p.flight_id, p.discord_user_id, p.discord_display_name,
      p.roles || {}, a.position || '', a.notes || '', p.submitted_at
    ]);
  }
}
function syncEvent(event) {
  if (!event || !/^[0-9a-f-]{36}$/i.test(String(event.event_id||''))) throw Error('Invalid event identifier');
  const types = {
    register_member: memberEvent, update_member: memberEvent,
    record_transaction: transactionEvent, flight_upsert: flightEvent,
    form_upsert: formEvent, form_response: formResponseEvent
  };
  const apply = types[event.event_type];
  if (!apply || !event.payload || typeof event.payload !== 'object') throw Error('Unsupported sync event');
  const completed = getSheet('Sync Events');
  const already = rows(completed).some(row => String(row[0]) === String(event.event_id));
  if (already) return { ok: true, duplicate: true };
  apply(event);
  completed.appendRow([clean(event.event_id),clean(event.event_type),new Date().toISOString()]);
  return { ok: true, duplicate: false };
}
function upsertDiscordMember(p) {
  if (!/^\d{15,22}$/.test(String(p.userId||'')) || !/^\d{15,22}$/.test(String(p.guildId||'')))
    throw Error('Invalid Discord user/server IDs');
  const sheet = getSheet('Members');
  const previous = rows(sheet).find(row => String(row[0]) === String(p.userId));
  const values=previous ? previous.slice() : Array(SCHEMAS['Members'].length).fill('');
  values[0]=p.userId; values[1]=p.discordUsername||''; values[2]=p.displayName||'';
  values[11]=new Date().toISOString(); if(!values[12])values[12]='Discord';
  upsert('Members', [0], values);
  upsert('Discord Roles', [0,2], [
    p.userId, p.displayName||'', p.guildId, p.guildName||'',
    p.roleIds||[], p.roleNames||[], new Date().toISOString()
  ]);
  return { ok: true };
}

/** Import a batch without a full-sheet round-trip for each person. */
function upsertDiscordRoster(members) {
  if (!Array.isArray(members) || members.length > 80) throw Error('Maximum 80 roster entries per request');
  const memberSheet = getSheet('Members'), roleSheet = getSheet('Discord Roles');
  const existingMembers = rows(memberSheet), existingRoles = rows(roleSheet);
  const memberCols = SCHEMAS['Members'].length, roleCols = SCHEMAS['Discord Roles'].length;
  const memberIndex = new Map(existingMembers.map((r,i)=>[String(r[0]),i]));
  const roleIndex = new Map(existingRoles.map((r,i)=>[String(r[0])+':'+String(r[2]),i]));
  for (const member of members) {
    if (!/^\d{15,22}$/.test(String(member.userId||'')) || !/^\d{15,22}$/.test(String(member.guildId||'')))
      throw Error('Invalid Discord identity');
    const memberId=String(member.userId), key=memberId+':'+String(member.guildId);
    let mIdx=memberIndex.get(memberId);
    if (mIdx===undefined) {
      mIdx=existingMembers.length;
      existingMembers.push(Array(memberCols).fill(''));
      memberIndex.set(memberId,mIdx);
    }
    const m=existingMembers[mIdx];
    m[0]=memberId; m[1]=member.discordUsername||''; m[2]=member.displayName||'';
    m[11]=new Date().toISOString(); if (!m[12])m[12]='Discord';
    const roleRow=[memberId,member.displayName||'',String(member.guildId),
      member.guildName||'',member.roleIds||[],member.roleNames||[],new Date().toISOString()];
    let rIdx=roleIndex.get(key);
    if (rIdx===undefined) {
      rIdx=existingRoles.length; existingRoles.push(roleRow); roleIndex.set(key,rIdx);
    } else existingRoles[rIdx]=roleRow;
  }
  if (existingMembers.length) memberSheet.getRange(2,1,existingMembers.length,memberCols)
    .setValues(existingMembers.map(row=>row.map(clean)));
  if (existingRoles.length) roleSheet.getRange(2,1,existingRoles.length,roleCols)
    .setValues(existingRoles.map(row=>row.map(clean)));
  return {ok:true,count:members.length};
}

function ledgerTotals() {
  return rows(getSheet('SkyMiles Ledger')).reduce((result,row)=>{
    const id=String(row[1]); if(!id)return result;
    const previous=result[id]||{userId:id,displayName:'',balance:0};
    previous.displayName=String(row[2]||previous.displayName);
    previous.balance+=Number(row[3])||0;
    result[id]=previous;
    return result;
  },{});
}
function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    const body=JSON.parse(e.postData.contents);
    const secret=PropertiesService.getScriptProperties().getProperty('WEBHOOK_SECRET');
    if(!secret || body.secret!==secret)return response({ok:false,error:'Unauthorized'});
    lock.waitLock(30000);
    let result;
    if(body.action==='syncEvent')result=syncEvent(body.event);
    else if(body.action==='upsertDiscordMember')result=upsertDiscordMember(body);
    else if(body.action==='upsertDiscordRoster')result=upsertDiscordRoster(body.members);
    else if(body.action==='balance')result={ok:true,...(ledgerTotals()[String(body.userId)]||{userId:String(body.userId),balance:0})};
    else if(body.action==='leaderboard')result={ok:true,leaders:Object.values(ledgerTotals()).sort((a,b)=>b.balance-a.balance).slice(0,25)};
    else throw Error('Unknown or unsupported action');
    SpreadsheetApp.flush();
    return response(result);
  } catch(error) {
    return response({ok:false,error:String(error.message||error)});
  } finally {
    if(lock.hasLock())lock.releaseLock();
  }
}

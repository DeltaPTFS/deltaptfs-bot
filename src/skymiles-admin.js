'use strict';
// The website's Owner/Admin Discord roles. Checked again by website API against
// live guild membership before any transaction commits.
const DEFAULT_ADMIN_ROLE_IDS = Object.freeze([
  '1539005297417519205',
  '1539005030189891684',
  '1539005033020919828',
]);
function parseRoleIds(value) {
  return new Set((typeof value === 'string' && value.trim() ? value.split(',') : DEFAULT_ADMIN_ROLE_IDS)
    .map((id) => String(id).trim()).filter((id) => /^\d{15,22}$/.test(id)));
}
function hasSkyMilesAdminRole(memberRoleIds, configured) {
  const allowed = parseRoleIds(configured);
  return Array.from(memberRoleIds || []).some((id) => allowed.has(String(id)));
}
module.exports = { DEFAULT_ADMIN_ROLE_IDS, parseRoleIds, hasSkyMilesAdminRole };

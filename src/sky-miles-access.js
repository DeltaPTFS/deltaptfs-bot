'use strict';

// Role IDs must match the website's Owner/Admin role configuration.
// Fail closed for malformed role data and never trust ManageGuild alone.
const DEFAULT_SKYMILES_ADMIN_ROLE_IDS = [
  '1539005297417519205', '1539005030189891684', '1539005033020919828'
];
function adminRoleIds(value) {
  return new Set((value === undefined ? DEFAULT_SKYMILES_ADMIN_ROLE_IDS.join(',') : value)
    .split(',').map(id => id.trim()).filter(id => /^\d{15,22}$/.test(id)));
}
function hasSkyMilesAdminRole(memberRoles, approved = adminRoleIds(process.env.SKYMILES_ADMIN_ROLE_IDS)) {
  if (!memberRoles) return false;
  const ids = Array.isArray(memberRoles) ? memberRoles
    : memberRoles instanceof Set ? [...memberRoles] : [];
  return ids.some(id => approved.has(String(id)));
}
module.exports = {adminRoleIds,hasSkyMilesAdminRole,DEFAULT_SKYMILES_ADMIN_ROLE_IDS};

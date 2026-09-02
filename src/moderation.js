const LEADERSHIP_GROUPS = new Set(['Board of Directors', 'Leadership']);
const FOUNDER_ROLE_NAME = 'Delta Founder';

function baseRoleName(name) {
  return name.replace(/\s*\|\s*Delta Air Lines$/i, '').trim();
}

function hasBaseRole(member, names) {
  return member.roles.cache.some((role) => names.has(baseRoleName(role.name)));
}

function canUseFounderCommands(member, founderRoleId) {
  if (founderRoleId && member.roles.cache.has(founderRoleId)) return true;
  return hasBaseRole(member, new Set([FOUNDER_ROLE_NAME]));
}

function canUseLeadershipCommands(member, roleGroups, leadershipRoleId, founderRoleId) {
  if (canUseFounderCommands(member, founderRoleId)) return true;
  if (leadershipRoleId) {
    const threshold = member.guild.roles.cache.get(leadershipRoleId);
    return Boolean(threshold && member.roles.highest.position >= threshold.position);
  }
  const names = new Set(roleGroups
    .filter((group) => LEADERSHIP_GROUPS.has(group.name))
    .flatMap((group) => group.roles.map((role) => role.name)));
  return hasBaseRole(member, names);
}

function targetHierarchyError(caller, target, guildOwnerId) {
  if (target.id === caller.id) return 'You cannot moderate yourself.';
  if (target.id === guildOwnerId) return 'The server owner cannot be moderated by this command.';
  if (target.roles.highest.position >= caller.roles.highest.position) return 'You cannot moderate a member whose highest role is equal to or higher than yours.';
  return null;
}

const TIMEOUT_DURATIONS = Object.freeze({
  '5m': 5 * 60_000,
  '10m': 10 * 60_000,
  '30m': 30 * 60_000,
  '1h': 60 * 60_000,
  '1d': 24 * 60 * 60_000,
  '1w': 7 * 24 * 60 * 60_000,
});

module.exports = {
  FOUNDER_ROLE_NAME,
  TIMEOUT_DURATIONS,
  baseRoleName,
  canUseFounderCommands,
  canUseLeadershipCommands,
  targetHierarchyError,
};

const { ROLE_GROUPS } = require('./roles');

const ATC_SPEAKER_GROUPS = new Set([
  'Board of Directors',
  'Leadership',
  'Executives',
  'Middle Rank',
  'Server Administration',
  'Flight Operations',
]);

function atcRolePolicies() {
  return ROLE_GROUPS.flatMap((group) => group.roles.map((role) => ({
    name: role.name,
    canSpeak: ATC_SPEAKER_GROUPS.has(group.name),
    prioritySpeaker: role.name === 'Air Traffic Control',
  })));
}

module.exports = { ATC_SPEAKER_GROUPS, atcRolePolicies };

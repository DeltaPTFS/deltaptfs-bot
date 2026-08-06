const ROLE_GROUPS = [
  {
    name: 'Board of Directors',
    categoryRole: { name: '━━ BOARD OF DIRECTORS ━━', color: '#4A000D' },
    roles: [
      { name: 'Chief Executive Officer', color: '#C8102E', hoist: true, permissions: ['ManageGuild', 'ManageChannels', 'ManageRoles'] },
      { name: 'Chief Operating Officer', color: '#D71920', hoist: true, permissions: ['ManageGuild', 'ManageChannels'] },
      { name: 'Chief Administrative Officer', color: '#B5121B', hoist: true, permissions: ['ManageGuild', 'ManageRoles'] },
      { name: 'Chief Flight Operations Officer', color: '#A30E1A', hoist: true, permissions: ['ManageGuild', 'ManageChannels'] },
      { name: 'Chief Human Resources Officer', color: '#8F0B17', hoist: true, permissions: ['ManageGuild', 'ManageRoles'] },
    ],
  },
  {
    name: 'Leadership',
    categoryRole: { name: '━━ LEADERSHIP ━━', color: '#5B1025' },
    roles: [
      { name: 'Chief of Staff', color: '#7A0019', hoist: true, permissions: ['ManageGuild', 'ManageChannels'] },
      { name: 'Chief of Corporate Affairs', color: '#8B1E3F', hoist: true, permissions: ['ManageGuild'] },
      { name: 'Chief of Safety', color: '#9E2A4D', hoist: true, permissions: ['ManageChannels'] },
    ],
  },
  {
    name: 'Executives',
    categoryRole: { name: '━━ EXECUTIVES ━━', color: '#6A1B4D' },
    roles: [
      { name: 'Senior High Rank', color: '#E31837', hoist: true },
      { name: 'Lead of Cabin Crew Department', color: '#D81B60', hoist: true, permissions: ['ManageChannels'] },
      { name: 'Lead of Flight Deck Department', color: '#C2185B', hoist: true, permissions: ['ManageChannels'] },
      { name: 'Lead of ATC Department', color: '#AD1457', hoist: true, permissions: ['ManageChannels'] },
      { name: 'Lead of Ground Operations Department', color: '#880E4F', hoist: true, permissions: ['ManageChannels'] },
    ],
  },
  {
    name: 'Middle Rank',
    categoryRole: { name: '━━ MIDDLE RANK ━━', color: '#5E2A84' },
    roles: [
      { name: 'Operations Manager', color: '#7B1FA2', hoist: true },
      { name: 'Department Manager', color: '#8E24AA', hoist: true },
      { name: 'Assistant Department Manager', color: '#9C27B0', hoist: true },
      { name: 'Supervisor', color: '#AB47BC', hoist: true },
    ],
  },
  {
    name: 'Server Administration',
    categoryRole: { name: '━━ SERVER ADMINISTRATION ━━', color: '#0B3D91' },
    roles: [
      { name: 'Senior Administration', color: '#0D47A1', hoist: true, permissions: ['ManageGuild', 'ManageChannels', 'ManageRoles', 'BanMembers', 'KickMembers', 'ModerateMembers'] },
      { name: 'Administration', color: '#1565C0', hoist: true, permissions: ['ManageChannels', 'ManageRoles', 'BanMembers', 'KickMembers', 'ModerateMembers'] },
      { name: 'Senior Moderation', color: '#1976D2', hoist: true, permissions: ['BanMembers', 'KickMembers', 'ModerateMembers'] },
      { name: 'Moderation', color: '#1E88E5', hoist: true, permissions: ['KickMembers', 'ModerateMembers'] },
    ],
  },
  {
    name: 'Flight Operations',
    categoryRole: { name: '━━ FLIGHT OPERATIONS ━━', color: '#D97706' },
    roles: [
      { name: 'Chief Pilot', color: '#F9A825', hoist: true },
      { name: 'Captain', color: '#FBC02D' },
      { name: 'First Officer', color: '#FDD835' },
      { name: 'Air Traffic Control', color: '#00897B', hoist: true },
      { name: 'Cabin Crew', color: '#26A69A' },
      { name: 'Ground Crew', color: '#4DB6AC' },
    ],
  },
  {
    name: 'SkyMiles Members',
    categoryRole: { name: '━━ SKYMILES MEMBERS ━━', color: '#0067B1' },
    roles: [
      { name: 'Diamond Medallion', color: '#00ACC1', hoist: true },
      { name: 'Platinum Medallion', color: '#5C6BC0' },
      { name: 'Gold Medallion', color: '#FFB300' },
      { name: 'Silver Medallion', color: '#B0BEC5' },
      { name: 'SkyMiles Member', color: '#0277BD' },
    ],
  },
  {
    name: 'Community',
    categoryRole: { name: '━━ COMMUNITY ━━', color: '#546E7A' },
    roles: [
      { name: 'Passenger', color: '#43A047' },
      { name: 'Aviation Enthusiast', color: '#78909C' },
      { name: 'Guest', color: '#90A4AE' },
    ],
  },
  {
    name: 'Application',
    categoryRole: { name: '━━ APPLICATION ━━', color: '#001F46' },
    roles: [
      { name: 'Delta Virtual Assistant', color: '#003268', hoist: true, app: true },
    ],
  },
];

function roleDefinitions() {
  return ROLE_GROUPS.flatMap((group) => [
    ...group.roles.map((role) => ({
      ...role,
      baseName: role.name,
      name: `${role.name} | Delta PTFS`,
    })),
    group.categoryRole,
  ]);
}

function formatRoles() {
  return ROLE_GROUPS.map((group) => [
    ...group.roles.map((role) => `  @${role.name} | Delta PTFS`),
    `  @${group.categoryRole.name}`,
  ].join('\n')).join('\n\n');
}

module.exports = { ROLE_GROUPS, formatRoles, roleDefinitions };

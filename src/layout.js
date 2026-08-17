const OPERATIONAL_ACCESS_ROLES = [
  'Chief Executive Officer',
  'Chief Operating Officer',
  'Chief Administrative Officer',
  'Chief Flight Operations Officer',
  'Chief Human Resources Officer',
  'Chief of Staff',
  'Chief of Corporate Affairs',
  'Chief of Safety',
  'Senior High Rank',
  'Lead of Cabin Crew Department',
  'Lead of Flight Deck Department',
  'Lead of ATC Department',
  'Lead of Ground Operations Department',
  'Lead of Marketing Department',
  'Lead of External Affairs Department',
  'Operations Manager',
  'Department Manager',
  'Assistant Department Manager',
  'Supervisor',
  'Senior Administration',
  'Administration',
  'Senior Moderation',
  'Moderation',
  'Chief Pilot',
  'Captain',
  'First Officer',
  'Air Traffic Control',
  'Cabin Crew',
  'Ground Crew',
];

const SERVER_LAYOUT = [
  {
    name: 'INFORMATION CENTER',
    legacyNames: ['WELCOME CENTER'],
    channels: [
      { name: 'information', legacyNames: ['welcome'], topic: 'Welcome to Delta Airlines.', visibleToUnverified: true },
      { name: 'rules', topic: 'Read the server rules before participating.' },
      { name: 'announcements', topic: 'Official Delta Airlines news and updates.' },
      { name: 'help-desk', legacyCategory: 'SUPPORT', topic: 'Ask for help with the server or an upcoming flight.' },
    ],
  },
  {
    name: 'VERIFICATION',
    visibleToUnverified: true,
    channels: [
      { name: 'verify', topic: 'Complete the Delta Airlines verification process here.', visibleToUnverified: true },
      { name: 'verification-help', topic: 'Request assistance if you cannot complete verification.', visibleToUnverified: true },
    ],
  },
  {
    name: 'FLIGHT OPERATIONS',
    hideFromUnverified: true,
    accessRoles: OPERATIONAL_ACCESS_ROLES,
    channels: [
      { name: 'flight-schedule', topic: 'Upcoming scheduled flights and events.' },
      { name: 'flight-status', topic: 'Live flight status updates.' },
      { name: 'book-a-flight', topic: 'Book a seat on an upcoming PTFS flight.' },
      { name: 'check-in', topic: 'Passenger check-in for scheduled flights.' },
      { name: 'route-map', topic: 'Published routes and destination information.' },
    ],
  },
  {
    name: 'COMMUNITY',
    hideFromUnverified: true,
    channels: [
      { name: 'general', topic: 'The main community conversation.' },
      { name: 'aviation-chat', topic: 'Discuss PTFS and real-world aviation.' },
      { name: 'photos-and-media', topic: 'Share screenshots, liveries, photos, and videos.' },
      { name: 'bot-commands', topic: 'Use bot commands here.' },
      { name: 'Community Lounge', type: 'voice' },
    ],
  },
  {
    name: 'CREW OPERATIONS',
    hideFromUnverified: true,
    accessRoles: OPERATIONAL_ACCESS_ROLES,
    channels: [
      { name: 'pilot-briefing', topic: 'Flight plans and briefings for the flight crew.' },
      { name: 'atc-coordination', topic: 'Coordination between pilots and air traffic control.' },
      { name: 'crew-chat', topic: 'Private operational discussion for staff and crew.' },
      { name: 'flight-logs', topic: 'Operational flight records and post-flight reports.' },
      { name: 'Operations Room', type: 'voice' },
    ],
  },
  {
    name: 'SUPPORT',
    hideFromUnverified: true,
    channels: [
      { name: 'suggestions', topic: 'Share suggestions for Delta Airlines.' },
    ],
  },
  {
    name: 'VOICE CHANNELS',
    hideFromUnverified: true,
    channels: [
      { name: 'Pre-flight Briefing', type: 'voice' },
      { name: 'Gate A', type: 'voice' },
      { name: 'Gate B', type: 'voice' },
    ],
  },
];

function formatLayout() {
  return SERVER_LAYOUT.map((category) => {
    const channels = category.channels.map((channel) =>
      `  ${channel.type === 'voice' ? '🔊' : '#'} ${channel.name}`);
    const privacy = category.accessRoles ? ' (private)' : '';
    return [`**${category.name}${privacy}**`, ...channels].join('\n');
  }).join('\n\n');
}

module.exports = { OPERATIONAL_ACCESS_ROLES, SERVER_LAYOUT, formatLayout };

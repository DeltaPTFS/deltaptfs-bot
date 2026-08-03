const SERVER_LAYOUT = [
  {
    name: 'WELCOME CENTER',
    channels: [
      { name: 'welcome', topic: 'Welcome to Delta Air Lines PTFS.' },
      { name: 'rules', topic: 'Read the server rules before participating.' },
      { name: 'announcements', topic: 'Official Delta Air Lines PTFS news and updates.' },
      { name: 'roles', topic: 'Information about server and operational roles.' },
      { name: 'faq', topic: 'Answers to frequently asked questions.' },
    ],
  },
  {
    name: 'FLIGHT OPERATIONS',
    accessRoles: [
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
    ],
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
    channels: [
      { name: 'general', topic: 'The main community conversation.' },
      { name: 'aviation-chat', topic: 'Discuss PTFS and real-world aviation.' },
      { name: 'photos-and-media', topic: 'Share screenshots, liveries, photos, and videos.' },
      { name: 'bot-commands', topic: 'Use bot commands here.' },
      { name: 'Community Lounge', type: 'voice' },
    ],
  },
  {
    name: 'AIR TRAFFIC CONTROL',
    channels: [
      { name: 'atc-information', topic: 'ATC frequencies, active controllers, and operational notices.' },
      { name: 'IRFD TWR [123.456]', type: 'voice' },
      { name: 'IPPH TWR [123.457]', type: 'voice' },
      { name: 'IZOL TWR [123.458]', type: 'voice' },
      { name: 'ITKO TWR [123.459]', type: 'voice' },
      { name: 'IBTH TWR [123.460]', type: 'voice' },
      { name: 'ISAB TWR [123.461]', type: 'voice' },
    ],
  },
  {
    name: 'CREW OPERATIONS',
    accessRoles: [
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
    ],
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
    channels: [
      { name: 'help-desk', topic: 'Ask for help with the server or an upcoming flight.' },
      { name: 'suggestions', topic: 'Share suggestions for Delta Air Lines PTFS.' },
    ],
  },
  {
    name: 'VOICE CHANNELS',
    channels: [
      { name: 'Pre-flight Briefing', type: 'voice' },
      { name: 'Gate A', type: 'voice' },
      { name: 'Gate B', type: 'voice' },
      { name: 'ATC Tower', type: 'voice' },
    ],
  },
];

function formatLayout() {
  return SERVER_LAYOUT.map((category) => {
    const channels = category.channels.map((channel) => {
      const marker = channel.type === 'voice' ? '🔊' : '#';
      return `  ${marker} ${channel.name}`;
    });
    const privacy = category.accessRoles ? ' (private)' : '';
    return [`**${category.name}${privacy}**`, ...channels].join('\n');
  }).join('\n\n');
}

module.exports = { SERVER_LAYOUT, formatLayout };

const ATC_FREQUENCY_GROUPS = [
  ['IRFD', ['DEL [121.750]', 'GND [121.900]', 'TWR [118.100]', 'APP [120.550]']],
  ['ITKO', ['DEL [121.700]', 'GND [121.800]', 'TWR [118.100]', 'APP [119.100]']],
  ['IZOL', ['DEL [121.650]', 'GND [121.850]', 'TWR [119.200]', 'APP [120.700]']],
  ['ILAR', ['DEL [121.900]', 'GND [121.700]', 'TWR [118.700]', 'APP [120.200]']],
  ['IPPH', ['DEL [121.600]', 'GND [121.700]', 'TWR [118.600]', 'APP [119.400]']],
  ['IMLR', ['DEL [121.950]', 'GND [121.650]', 'TWR [119.750]', 'APP [120.900]']],
  ['IPAP', ['DEL [121.900]', 'GND [121.700]', 'TWR [119.400]', 'APP [120.600]']],
  ['IKFL', ['DEL [121.850]', 'GND [121.900]', 'TWR [118.300]', 'APP [119.000]']],
  ['ISAU', ['DEL [121.650]', 'GND [121.850]', 'TWR [118.900]', 'APP [120.450]']],
  ['IBTH', ['DEL [121.700]', 'GND [121.900]', 'TWR [118.300]', 'APP [119.900]']],
  ['ILKL', ['DEL [121.600]', 'GND [121.800]', 'TWR [122.900]', 'APP [123.200]']],
  ['IDCS', ['DEL [121.700]', 'GND [121.900]', 'TWR [118.700]', 'APP [119.700]']],
  ['IIAB', ['DEL [121.650]', 'GND [121.900]', 'TWR [126.200]', 'APP [125.500]']],
  ['ISCM', ['DEL [121.850]', 'GND [121.700]', 'TWR [122.100]', 'APP [124.300]']],
  ['IGAR', ['DEL [121.600]', 'GND [121.900]', 'TWR [126.500]', 'APP [125.900]']],
  ['FORD', ['TWR [123.450]', 'APP [124.500]']],
  ['QE', ['TWR [123.550]', 'APP [124.600]']],
  ['UNICOM', ['[122.800]']],
];

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
  ...ATC_FREQUENCY_GROUPS.map(([airport, frequencies]) => ({
    name: airport === 'UNICOM' ? 'UNICOM FREQUENCY' : `${airport} FREQUENCIES`,
    bottom: true,
    channels: frequencies.map((frequency) => ({
      name: `🔊 ${airport}${airport === 'UNICOM' ? ' ' : '_'}${frequency}`,
      type: 'voice',
      flightDeckOnly: true,
    })),
  })),
];

function formatLayout() {
  return SERVER_LAYOUT.map((category) => {
    const channels = category.channels.map((channel) => {
      const marker = channel.type === 'voice' ? '🔊' : '#';
      return `  ${channel.name.startsWith('🔊 ') ? '' : `${marker} `}${channel.name}`;
    });
    const privacy = category.accessRoles ? ' (private)' : '';
    return [`**${category.name}${privacy}**`, ...channels].join('\n');
  }).join('\n\n');
}

module.exports = { ATC_FREQUENCY_GROUPS, SERVER_LAYOUT, formatLayout };

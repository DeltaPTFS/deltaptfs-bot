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
  // Discord permits at most 50 channels per category, so the complete
  // frequency network is split between two categories kept at the bottom.
  {
    name: 'ATC FREQUENCIES 1',
    bottom: true,
    channels: [
      'IRFD_DEL [121.750]', 'IRFD_GND [121.900]', 'IRFD_TWR [118.100]', 'IRFD_APP [120.550]',
      'ITKO_DEL [121.700]', 'ITKO_GND [121.800]', 'ITKO_TWR [118.100]', 'ITKO_APP [119.100]',
      'IZOL_DEL [121.650]', 'IZOL_GND [121.850]', 'IZOL_TWR [119.200]', 'IZOL_APP [120.700]',
      'ILAR_DEL [121.900]', 'ILAR_GND [121.700]', 'ILAR_TWR [118.700]', 'ILAR_APP [120.200]',
      'IPPH_DEL [121.600]', 'IPPH_GND [121.700]', 'IPPH_TWR [118.600]', 'IPPH_APP [119.400]',
      'IMLR_DEL [121.950]', 'IMLR_GND [121.650]', 'IMLR_TWR [119.750]', 'IMLR_APP [120.900]',
      'IPAP_DEL [121.900]', 'IPAP_GND [121.700]', 'IPAP_TWR [119.400]', 'IPAP_APP [120.600]',
      'IKFL_DEL [121.850]', 'IKFL_GND [121.900]', 'IKFL_TWR [118.300]', 'IKFL_APP [119.000]',
    ].map((name) => ({ name: `🔊 ${name}`, type: 'voice', flightDeckOnly: true })),
  },
  {
    name: 'ATC FREQUENCIES 2',
    bottom: true,
    channels: [
      'ISAU_DEL [121.650]', 'ISAU_GND [121.850]', 'ISAU_TWR [118.900]', 'ISAU_APP [120.450]',
      'IBTH_DEL [121.700]', 'IBTH_GND [121.900]', 'IBTH_TWR [118.300]', 'IBTH_APP [119.900]',
      'ILKL_DEL [121.600]', 'ILKL_GND [121.800]', 'ILKL_TWR [122.900]', 'ILKL_APP [123.200]',
      'IDCS_DEL [121.700]', 'IDCS_GND [121.900]', 'IDCS_TWR [118.700]', 'IDCS_APP [119.700]',
      'IIAB_DEL [121.650]', 'IIAB_GND [121.900]', 'IIAB_TWR [126.200]', 'IIAB_APP [125.500]',
      'ISCM_DEL [121.850]', 'ISCM_GND [121.700]', 'ISCM_TWR [122.100]', 'ISCM_APP [124.300]',
      'IGAR_DEL [121.600]', 'IGAR_GND [121.900]', 'IGAR_TWR [126.500]', 'IGAR_APP [125.900]',
      'FORD_TWR [123.450]', 'FORD_APP [124.500]', 'QE_TWR [123.550]', 'QE_APP [124.600]',
      'UNICOM [122.800]',
    ].map((name) => ({ name: `🔊 ${name}`, type: 'voice', flightDeckOnly: true })),
  },
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

module.exports = { SERVER_LAYOUT, formatLayout };

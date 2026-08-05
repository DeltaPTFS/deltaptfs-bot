const INFO_MESSAGES = [
  {
    content: `# :information: Welcome to Delta Air Lines

Welcome aboard **Delta Air Lines**, a growing PTFS virtual airline focused on professionalism, teamwork, realism, and an enjoyable experience for every member. Whether you join us as a passenger, crew member, future applicant, or aviation enthusiast, we are excited to have you become part of our community.

Our server offers realistic flight operations, organized community events, structured training, career opportunities, and continued development. Please review the information below before participating so you understand how our community operates.

**Keep Climbing.** :logo:`,
    banner: 'welcome',
    bannerEnv: 'INFO_WELCOME_BANNER_URL',
  },
  {
    content: `# :rules: Community Rules

All members must treat one another with respect, regardless of position or experience. Harassment, bullying, discrimination, excessive toxicity, inappropriate content, and personal attacks are strictly prohibited.

Do not spam, troll, exploit, impersonate staff, falsely claim a position, or intentionally disrupt flights, training sessions, events, or conversations. Advertising another community without approval is also prohibited.

Follow all instructions given by authorized Delta staff during official operations. Use every channel for its intended purpose and comply with both the **Discord Terms of Service** and **Roblox Community Standards**.

Consequences may include a warning, temporary suspension, removal from a department, or permanent removal from the community, depending on the seriousness and frequency of the violation.`,
    banner: 'community-rules',
    bannerEnv: 'INFO_RULES_BANNER_URL',
  },
  {
    content: `# :roles: Notification Roles

Notification roles are available through the **reaction-role panel at the bottom of this message**. Each reaction will be clearly labeled with the type of notification it provides.

Select only the roles that match your interests. Available notifications may include flights, events, hiring, giveaways, announcements, development updates, training sessions, and other important server activities.

You may add or remove your notification roles at any time by reacting or removing your reaction from the corresponding emoji.`,
    banner: 'notifications',
    bannerEnv: 'INFO_NOTIFICATIONS_BANNER_URL',
  },
  {
    content: `# :events: Community Events

Delta Air Lines regularly hosts scheduled flights, training sessions, community activities, giveaways, celebrations, and other special events.

Event details will include the date, start time, participation requirements, and any available positions. Members should read each event announcement carefully and arrive on time when they confirm attendance.

Major events may have limited space, so participation may be handled through reaction sign-ups, threads, or designated registration forms.`,
    banner: 'events',
    bannerEnv: 'INFO_EVENTS_BANNER_URL',
  },
  {
    content: `# :operations: Flight Operations

Flight Operations are hosted **multiple times throughout the day**, providing regular opportunities for passengers and qualified staff to participate. Each flight announcement will include the aircraft, route, departure time, available positions, and instructions for joining.

Applications for Flight Operations remain open and are **reviewed every Monday**. Applicants should provide complete and truthful responses, as incomplete or low-effort submissions may be denied.

> :ExternalLink: **[Apply for Flight Operations](https://forms.gle/WvXSf82Tvz3YJ4EJ7)**

Accepted applicants must complete the required training and certification process before independently serving in an operational position.

Questions about applications, training, roles, or flight participation should be directed to our HelpDesk:

> :support: **[Visit the Delta HelpDesk](https://discord.com/channels/1533702595800076310/1533882344220528740)**`,
    banner: 'flight-operations',
    bannerEnv: 'INFO_FLIGHT_OPERATIONS_BANNER_URL',
  },
  {
    content: `# :support: Need Assistance?

Our HelpDesk is available for application questions, department assistance, reports, technical problems, and general support.

When requesting help, clearly explain the issue and provide any relevant screenshots or information. Please allow the staff team enough time to review your request and avoid repeatedly pinging or messaging multiple staff members about the same matter.

Thank you for choosing **Delta Air Lines**.

-# :SkyTeamLogo: **Keep Climbing, Delta Air Lines.**`,
    banner: 'skyteam',
    bannerEnv: 'INFO_ASSISTANCE_BANNER_URL',
  },
];

function bannerUrl(message, environment = process.env) {
  return environment[message.bannerEnv]?.trim() || null;
}

function infoMessagePayload(message, environment = process.env) {
  const url = bannerUrl(message, environment);
  const payload = { content: message.content };
  if (url) {
    payload.embeds = [{ image: { url } }];
  }
  return payload;
}

function missingBannerEnvironmentKeys(environment = process.env) {
  return INFO_MESSAGES
    .map((message) => message.bannerEnv)
    .filter((key) => !environment[key]?.trim());
}

module.exports = { INFO_MESSAGES, bannerUrl, infoMessagePayload, missingBannerEnvironmentKeys };

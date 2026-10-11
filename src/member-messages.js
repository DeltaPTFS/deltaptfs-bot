const AUTHENTICATION_WELCOME_MESSAGE = `<:Heart:1541639571266080819> **Welcome to Delta.**

-# P.O. Box 20980 Department 980 Atlanta, GA 30320-2980.

> <:WingPinLogo:1540927847709802607> **You have officially** been **authenticated** in **Delta Air Lines.** We **encourage** you to **explore** our server, **interact** with others, **check out** our **onboard offerings,** and view our **Loyalty Program SkyMiles!**

-# Thank you for joining **Delta Air Lines, a Member of SkyTeam Alliance.**`;


const DELTA_WEBSITE_URL = 'https://roblox-delta-web.vercel.app';
const MAIN_DELTA_GUILD_ID = '1538738611988467782';

/**
 * A new-member DM (not the Roblox authentication confirmation).
 * Keep this under Discord's 2,000-character limit and do not ping everyone.
 */
function newMemberWelcomeMessage({ websiteUrl = DELTA_WEBSITE_URL } = {}) {
  const safeUrl = typeof websiteUrl === 'string' && /^https:\/\/[a-z0-9.-]+(?:\/[a-z0-9/_?=&%.-]*)?$/i.test(websiteUrl)
    ? websiteUrl : DELTA_WEBSITE_URL;
  return [
    '## <:DeltaLogo:1540927958116601980> Welcome Aboard Delta Air Lines! | <:SkyTeamLogo:1540927923618316359>',
    '-# <:Blank:1540951736062312529><:Connection:1540927881683669013> 1021 N Outer Loop Rd, East Point, GA, 30344.',
    '',
    '> <:BArrow:1540951845147639809> **Welcome to Delta Air Lines!** We\'re delighted to have you join our Roblox aviation roleplay community, where **realism, professionalism, and unforgettable experiences** come together.',
    '',
    '> <:RArrow:1540951788889575504> **Your Journey Starts Here!** Whether you\'re joining us as a **passenger, aspiring crew member, or aviation enthusiast,** there\'s a place for you at Delta. Explore hosted flights and our growing community.',
    '',
    '> <:Plane:1540926994332651580> **Get Started**',
    '> ✦ Complete your server verification.',
    '> ✦ Read our rules and explore community channels.',
    '> ✦ Register for **SkyMiles** and start earning virtual rewards.',
    '> ✦ Follow upcoming flights, events, and crew opportunities.',
    '',
    '> <:RArrow:1540951788889575504> **Delta Air Lines Website:** ' + safeUrl,
    '> Explore flight schedules, applications, and SkyMiles from one place.',
    '',
    '> <:RArrow:1540951788889575504> **At Delta, every journey matters.** We look forward to seeing you take to the skies with us!',
    '',
    '-# <:WingPinLogo:1540927847709802607> **Keep Climbing, Delta Air Lines.**',
  ].join('\n');
}

/** Only send the welcome to a real new main-server member, never other guilds. */
async function sendNewMemberWelcome(member, { guildId = MAIN_DELTA_GUILD_ID, websiteUrl, logger = console } = {}) {
  if (!member || member.user?.bot || member.guild?.id !== guildId) return false;
  try {
    await member.send({
      content: newMemberWelcomeMessage({ websiteUrl }),
      allowedMentions: { parse: [] },
    });
    return true;
  } catch (error) {
    // Members may block DMs from server users. This must never disrupt
    // welcome-role assignments, audit logging, or roster synchronization.
    logger.warn?.(`Delta welcome DM could not be delivered to ${member.id}: ${error?.message || error}`);
    return false;
  }
}

function newsletterContent(value) {
  const content = value?.trim();
  if (!content) throw new Error('Newsletter content cannot be empty.');
  if (content.length > 2000) throw new Error('Newsletter content cannot exceed 2,000 characters.');
  return content;
}

module.exports = { AUTHENTICATION_WELCOME_MESSAGE, DELTA_WEBSITE_URL, MAIN_DELTA_GUILD_ID, newMemberWelcomeMessage, sendNewMemberWelcome, newsletterContent };

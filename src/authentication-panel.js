const WELCOME_BANNER_URL = 'https://cdn.discordapp.com/attachments/1377823784160985240/1541508890443911281/Delta_Airlines_Banner_Welcome_Onboard.png?ex=6a8dd987&is=6a8c8807&hm=d3bac14ad0a5701f97f47f8461c67808cd6dc60ef1909e1d8fe9f3aeaf62d5a0&';
const MIDDLE_BANNER_URL = 'https://cdn.discordapp.com/attachments/1377823784160985240/1541508871233871992/Delta_Airlines_Banner_Middle.png?ex=6a8dd982&is=6a8c8802&hm=390986adfcba2a83fb83a09ea9f1a88d4a0081f602623b528ef812369d1ed5b5&';
const BOTTOM_BANNER_URL = 'https://cdn.discordapp.com/attachments/1377823784160985240/1541509201187049502/Delta_Airlines_Banner_Bottom.png?ex=6a8dd9d1&is=6a8c8851&hm=434cdae9d94ba9aa0b385cfef854168c513587d8795821c15966c520dd1c2424&';

const AUTHENTICATION_PANEL_MESSAGES = Object.freeze([
  null,
  null,
  `:DeltaLogo: **Authentication | :SkyTeamLogo:**
-# :Blank: :Connection: 1021 N Outer Loop Rd, East Point, GA, 30344.

> :BArrow: **Welcome aboard!**
> To gain access to the Delta Air Lines server, you must complete the authentication process.

:Nametag: **Step 1 | Roleplay Name**

Click the **Authenticate** button below and enter your Delta RP name when prompted. Do not use your real name. Use a realistic, made-up name that follows the server's RP naming format.`,
  `:ExternalLink: **Step 2 | Roblox Authentication**

After entering your RP name, you will be redirected to Roblox's authentication website to confirm that you own the Roblox account being connected.`,
  `:DeltaLogo: **Step 3 | You're Cleared!**

Once your Roblox account has been successfully authenticated, you will automatically receive the **Verified** role and gain access to the appropriate areas of the server.

:Warning: **Having trouble authenticating?**

Please visit <#1539005082308321331> for assistance.

:WingPinLogo: **Keep Climbing, Delta Air Lines.**`,
]);

const PANEL_ATTACHMENTS = Object.freeze([
  { attachment: WELCOME_BANNER_URL, name: 'Delta_Airlines_Banner_Welcome_Onboard.png' },
  { attachment: MIDDLE_BANNER_URL, name: 'Delta_Airlines_Banner_Middle.png' },
  { attachment: BOTTOM_BANNER_URL, name: 'Delta_Airlines_Banner_Bottom_Step_1.png' },
  { attachment: BOTTOM_BANNER_URL, name: 'Delta_Airlines_Banner_Bottom_Step_2.png' },
  { attachment: BOTTOM_BANNER_URL, name: 'Delta_Airlines_Banner_Bottom_Step_3.png' },
]);

function findGuildEmoji(guild, name) {
  return guild?.emojis?.cache?.find((emoji) => emoji.name?.toLowerCase() === name.toLowerCase()) ?? null;
}

function resolveCustomEmojis(content, guild) {
  return content.replace(/:([A-Za-z][A-Za-z0-9_-]*):/g, (token, name) =>
    findGuildEmoji(guild, name)?.toString() ?? token);
}

function authenticationPanelPayloads(guild) {
  const externalLink = findGuildEmoji(guild, 'ExternalLink');
  const button = {
    type: 2,
    style: 1,
    custom_id: 'authentication-panel:start',
    label: 'Authenticate',
  };
  if (externalLink) button.emoji = { id: externalLink.id, name: externalLink.name };

  return PANEL_ATTACHMENTS.map((file, index) => ({
    ...(AUTHENTICATION_PANEL_MESSAGES[index]
      ? { content: resolveCustomEmojis(AUTHENTICATION_PANEL_MESSAGES[index], guild) }
      : {}),
    files: [file],
    ...(index === 4 ? { components: [{ type: 1, components: [button] }] } : {}),
  }));
}

module.exports = {
  AUTHENTICATION_PANEL_MESSAGES,
  BOTTOM_BANNER_URL,
  MIDDLE_BANNER_URL,
  PANEL_ATTACHMENTS,
  WELCOME_BANNER_URL,
  authenticationPanelPayloads,
};

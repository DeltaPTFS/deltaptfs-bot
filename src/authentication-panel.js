const WELCOME_BANNER_URL = 'https://cdn.discordapp.com/attachments/1539005081364471828/1542761468502474832/Delta_Airlines_Banner_Welcome_Onboard.png?ex=6a926815&is=6a911695&hm=be3a7e3bcfe5c774a9557d4f9c6c287fc132be7543c702a0b7cbf8095e9cfe2b&';
const MIDDLE_BANNER_URL = 'https://cdn.discordapp.com/attachments/1539005081364471828/1542761993327485008/Delta_Airlines_Banner_Middle.png?ex=6a926892&is=6a911712&hm=de254548fb8ef24a399bfcacce0d2bd4319e9dbfcc6d38dc2e9e46f5df3dc171&';
const BOTTOM_BANNER_URL = 'https://cdn.discordapp.com/attachments/1539005081364471828/1542762428389920798/Delta_Airlines_Banner_Bottom.png?ex=6a9268fa&is=6a91177a&hm=3c3f460d80c28cd8bf42fab4aa0deff9bcb3e8db2e92652c94cfe58f15f0cfe9&';

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

const AUTHENTICATION_PANEL_CONTENT = `:DeltaLogo: **Authentication | :SkyTeamLogo:**
-# :Blank: :Connection: 1021 N Outer Loop Rd, East Point, GA, 30344.

> :BArrow: **Welcome aboard!**
> To gain access to the Delta Air Lines server, you must authenticate your Roblox account.

:Nametag: **Step 1 | Roleplay Name**

**Your last-name initial must include a period, such as S.**

Click the button below and enter your Delta RP name when prompted. Do not use your real name. Use a realistic, made-up RP name following the server's required format.

:ExternalLink: **Step 2 | Roblox Authentication**

After entering your RP name, you will continue to Roblox's authentication website to confirm that you own the Roblox account being connected.

:DeltaLogo: **Step 3 | You're Cleared!**

Once your Roblox account has been successfully authenticated, the bot will automatically give you the **Verified** role that is already configured within the system.

:Warning: **Having trouble authenticating?**

Please visit <#1539005082308321331> for assistance.

:WingPinLogo: **Keep Climbing, Delta Air Lines.**`;

const PANEL_EMOJI_NAMES = Object.freeze([
  'DeltaLogo', 'SkyTeamLogo', 'Blank', 'Connection', 'BArrow',
  'Nametag', 'ExternalLink', 'Warning', 'WingPinLogo',
]);

function findGuildEmoji(guild, name) {
  return guild?.emojis?.cache?.find((emoji) => emoji.name?.toLowerCase() === name.toLowerCase()) ?? null;
}

function resolveAuthenticationPanelContent(guild) {
  return AUTHENTICATION_PANEL_CONTENT.replace(/:([A-Za-z][A-Za-z0-9_-]*):/g, (token, name) => {
    if (!PANEL_EMOJI_NAMES.some((allowed) => allowed.toLowerCase() === name.toLowerCase())) return token;
    return findGuildEmoji(guild, name)?.toString() ?? token;
  });
}

function authenticationPanelPayload(guild) {
  const externalLink = findGuildEmoji(guild, 'ExternalLink');
  const button = {
    type: 2,
    style: 1,
    custom_id: 'authentication-panel:start',
    label: 'Authenticate',
  };
  if (externalLink) button.emoji = { id: externalLink.id, name: externalLink.name };

  return {
    content: resolveAuthenticationPanelContent(guild),
    components: [{ type: 1, components: [button] }],
  };
}

module.exports = {
  AUTHENTICATION_PANEL_CONTENT,
  authenticationPanelPayload,
  resolveAuthenticationPanelContent,
};

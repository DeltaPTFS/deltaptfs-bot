const DISCORD_INVITE_PATTERN = /(?:https?:\/\/)?(?:www\.)?(?:discord\.gg|discord(?:app)?\.com\/invite)\/[A-Za-z0-9-]+/i;

function containsDiscordInvite(content) {
  return DISCORD_INVITE_PATTERN.test(content || '');
}

function isTicketChannel(channel) {
  return [channel?.name, channel?.parent?.name]
    .some((name) => typeof name === 'string' && /(?:^|[-_ ])tickets?(?:[-_ ]|$)/i.test(name));
}

function memberAtOrAboveRole(member, roleId) {
  const threshold = member?.guild?.roles?.cache?.get(roleId);
  return Boolean(threshold && member.roles.highest.position >= threshold.position);
}

function messageDescription(message) {
  const content = message.content?.trim() || '*No text content was available.*';
  return content.slice(0, 3500);
}

module.exports = { containsDiscordInvite, isTicketChannel, memberAtOrAboveRole, messageDescription };

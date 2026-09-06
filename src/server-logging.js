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

function createMessageSnapshotCache(limit = 10_000) {
  if (!Number.isInteger(limit) || limit < 1) throw new Error('Snapshot cache limit must be a positive integer.');
  const snapshots = new Map();
  return {
    remember(message) {
      if (!message?.id) return;
      snapshots.delete(message.id);
      snapshots.set(message.id, {
        content: message.content || '',
        authorId: message.author?.id || null,
        authorTag: message.author?.tag || null,
        channelId: message.channelId || message.channel?.id || null,
      });
      while (snapshots.size > limit) snapshots.delete(snapshots.keys().next().value);
    },
    get(messageId) {
      return snapshots.get(messageId) || null;
    },
    take(messageId) {
      const snapshot = snapshots.get(messageId) || null;
      snapshots.delete(messageId);
      return snapshot;
    },
  };
}

module.exports = {
  containsDiscordInvite,
  createMessageSnapshotCache,
  isTicketChannel,
  memberAtOrAboveRole,
  messageDescription,
};

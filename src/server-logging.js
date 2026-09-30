const DISCORD_INVITE_PATTERN = /(?:https?:\/\/)?(?:www\.)?(?:discord\.gg|discord(?:app)?\.com\/invite)\/[A-Za-z0-9-]+/i;
const DELTA_COLORS = Object.freeze({ navy: 0x071D49, blue: 0x236192, red: 0xC8102E, gray: 0x6B7280 });
const DELTA_LOG_FOOTER = 'Delta Air Lines • Safety & Moderation';
const UPDATE_FOOTER = 'Delta System Update • Replaceable';
const NON_DELTA_EMOJI_PATTERN = /[\p{Extended_Pictographic}\u2139\u26A0\u2705\u274C]\uFE0F?/gu;

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

function resolveDeltaEmoji(guild, preferredNames = ['DeltaLogo']) {
  const names = preferredNames.map((name) => name.toLowerCase());
  const cache = guild?.emojis?.cache;
  const emoji = cache?.find
    ? cache.find((candidate) => names.includes(candidate.name?.toLowerCase()))
    : [...(cache?.values?.() || [])].find((candidate) => names.includes(candidate.name?.toLowerCase()));
  return emoji?.toString() || '';
}

function withoutNonDeltaEmojis(value) {
  return typeof value === 'string' ? value.replace(NON_DELTA_EMOJI_PATTERN, '').replace(/\s{2,}/g, ' ').trim() : value;
}

function decorateLogEmbed(embed, guild) {
  const logo = resolveDeltaEmoji(guild);
  const cleanTitle = withoutNonDeltaEmojis(embed.title);
  return {
    color: DELTA_COLORS.navy,
    ...embed,
    title: cleanTitle ? `${logo ? `${logo} ` : ''}${cleanTitle}` : undefined,
    author: embed.author || { name: 'DELTA • OPERATIONS LOG', icon_url: guild?.iconURL?.() || undefined },
    footer: embed.footer || { text: DELTA_LOG_FOOTER },
    timestamp: embed.timestamp || new Date().toISOString(),
  };
}

function nextWeeklyReportDelay(now = new Date()) {
  // Search real instants rather than applying a fixed UTC offset, so this remains
  // correct on both sides of US daylight-saving transitions.
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York', weekday: 'short', hour: '2-digit', minute: '2-digit',
    hourCycle: 'h23',
  });
  const minute = 60_000;
  const start = Math.floor(now.getTime() / minute) * minute + minute;
  for (let timestamp = start; timestamp <= start + (8 * 24 * 60 * minute); timestamp += minute) {
    const parts = Object.fromEntries(formatter.formatToParts(new Date(timestamp)).map(({ type, value }) => [type, value]));
    if (parts.weekday === 'Sun' && parts.hour === '00' && parts.minute === '00') return timestamp - now.getTime();
  }
  throw new Error('Could not calculate the next weekly report time.');
}

function summarizeLogMessages(messages) {
  const records = [...messages]
    .filter((message) => message.embeds?.length)
    .flatMap((message) => message.embeds.map((embed) => ({
      timestamp: message.createdAt || new Date(message.createdTimestamp),
      title: embed.title || 'Untitled log entry',
      url: message.url,
    })))
    .sort((a, b) => a.timestamp - b.timestamp);
  const totals = new Map();
  for (const { title } of records) totals.set(title, (totals.get(title) || 0) + 1);
  return { records, totals };
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
  decorateLogEmbed,
  DELTA_COLORS,
  DELTA_LOG_FOOTER,
  isTicketChannel,
  memberAtOrAboveRole,
  messageDescription,
  nextWeeklyReportDelay,
  resolveDeltaEmoji,
  summarizeLogMessages,
  UPDATE_FOOTER,
  withoutNonDeltaEmojis,
};

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const {
  containsDiscordInvite,
  createMessageSnapshotCache,
  decorateLogEmbed,
  isTicketChannel,
  memberAtOrAboveRole,
  nextWeeklyReportDelay,
  resolveDeltaEmoji,
  summarizeLogMessages,
} = require('../src/server-logging');

test('detects Discord invite links while exempting ticket channels', () => {
  assert.equal(containsDiscordInvite('join https://discord.gg/example'), true);
  assert.equal(containsDiscordInvite('https://discord.com/invite/example'), true);
  assert.equal(containsDiscordInvite('https://delta.com'), false);
  assert.equal(isTicketChannel({ name: 'ticket-jordan', parent: null }), true);
  assert.equal(isTicketChannel({ name: 'chat', parent: { name: 'SUPPORT TICKETS' } }), true);
  assert.equal(isTicketChannel({ name: 'general', parent: { name: 'COMMUNITY' } }), false);
});

test('invite access uses the configured Discord role hierarchy', () => {
  const threshold = { id: 'access', position: 10 };
  const guild = { roles: { cache: new Map([['access', threshold]]) } };
  assert.equal(memberAtOrAboveRole({ guild, roles: { highest: { position: 10 } } }, 'access'), true);
  assert.equal(memberAtOrAboveRole({ guild, roles: { highest: { position: 9 } } }, 'access'), false);
});

test('retains recently observed message content for deletion logs', () => {
  const cache = createMessageSnapshotCache(2);
  cache.remember({ id: '1', content: 'first message', author: { id: '10', tag: 'member' }, channelId: '20' });
  cache.remember({ id: '2', content: 'message that was deleted', author: { id: '10', tag: 'member' }, channelId: '20' });
  assert.equal(cache.take('2').content, 'message that was deleted');
  assert.equal(cache.get('2'), null);
  cache.remember({ id: '3', content: 'third' });
  cache.remember({ id: '4', content: 'fourth' });
  assert.equal(cache.get('1'), null);
});

test('server logging events and configured channels are wired into the bot', () => {
  const source = fs.readFileSync('src/index.js', 'utf8');
  for (const event of ['MessageCreate', 'MessageDelete', 'MessageUpdate', 'InviteCreate', 'GuildBanAdd', 'GuildMemberAdd', 'GuildMemberRemove', 'AutoModerationActionExecution']) {
    assert.match(source, new RegExp(`Events\\.${event}`));
  }
  assert.match(source, /moderationAccess\(caller\)/);
  assert.match(source, /memberToReset\.roles\.add\(unauthenticatedRole/);
  assert.match(source, /roles\.fetch\(guildConfig\.unauthenticatedRoleId\)/);
  assert.match(source, /messageSnapshots\.take\(message\.id\)/);
  assert.match(source, /AuditLogEvent\.MessageDelete/);
  assert.match(source, /AuditLogEvent\.MemberRoleUpdate/);
  assert.match(source, /name: 'Executed By'/);
});

test('decorates Delta logs consistently without replacing event styling', () => {
  const deltaLogo = { name: 'DeltaLogo', toString: () => '<:DeltaLogo:123456789012345678>' };
  const guild = {
    iconURL: () => 'https://example.com/icon.png',
    emojis: { cache: { find: (predicate) => [deltaLogo].find(predicate) } },
  };
  const embed = decorateLogEmbed({ title: '🛬 Member Joined', color: 123 }, guild);
  assert.equal(embed.color, 123);
  assert.equal(embed.title, '<:DeltaLogo:123456789012345678> Member Joined');
  assert.equal(embed.author.name, 'DELTA • OPERATIONS LOG');
  assert.match(embed.footer.text, /Delta Air Lines/);
  assert.ok(embed.timestamp);
  assert.equal(resolveDeltaEmoji(guild), '<:DeltaLogo:123456789012345678>');
});

test('logs never substitute a non-Delta emoji when the server logo is unavailable', () => {
  const embed = decorateLogEmbed({ title: '🛡️ AutoMod Violation Detected' }, { emojis: { cache: new Map() } });
  assert.equal(embed.title, 'AutoMod Violation Detected');
  assert.doesNotMatch(embed.footer.text, /[🛡🔺]/u);
});

test('calculates Sunday midnight in America/New_York across daylight saving time', () => {
  const winterNow = new Date('2026-01-10T23:00:00.000Z');
  assert.equal(nextWeeklyReportDelay(winterNow), 6 * 60 * 60 * 1000);
  const summerNow = new Date('2026-07-04T23:00:00.000Z');
  assert.equal(nextWeeklyReportDelay(summerNow), 5 * 60 * 60 * 1000);
});

test('weekly reports sort and count every embed log entry', () => {
  const first = { createdAt: new Date('2026-01-01T02:00:00Z'), url: 'two', embeds: [{ title: 'Edited' }] };
  const second = { createdAt: new Date('2026-01-01T01:00:00Z'), url: 'one', embeds: [{ title: 'Deleted' }, { title: 'Edited' }] };
  const summary = summarizeLogMessages([first, second]);
  assert.deepEqual(summary.records.map(({ title }) => title), ['Deleted', 'Edited', 'Edited']);
  assert.equal(summary.totals.get('Edited'), 2);
});

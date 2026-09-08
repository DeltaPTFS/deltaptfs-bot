const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { containsDiscordInvite, createMessageSnapshotCache, isTicketChannel, memberAtOrAboveRole } = require('../src/server-logging');

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
  for (const event of ['MessageCreate', 'MessageDelete', 'MessageUpdate', 'InviteCreate', 'GuildBanAdd', 'GuildMemberRemove']) {
    assert.match(source, new RegExp(`Events\\.${event}`));
  }
  assert.match(source, /caller\.roles\.cache\.has\(config\.moderationLeadershipRoleId\)/);
  assert.match(source, /memberToReset\.roles\.add\(unauthenticatedRole/);
  assert.match(source, /roles\.fetch\(guildConfig\.unauthenticatedRoleId\)/);
  assert.match(source, /messageSnapshots\.take\(message\.id\)/);
  assert.match(source, /AuditLogEvent\.MessageDelete/);
  assert.match(source, /AuditLogEvent\.MemberRoleUpdate/);
  assert.match(source, /name: 'Executed By'/);
});

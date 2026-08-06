const ROBLOX_COMMUNITY_URL = 'https://www.roblox.com/share/g/650682730';

function normalizedRoleName(name) {
  return name.toLowerCase().replace(/\s*\|\s*delta ptfs$/i, '').trim();
}

function createRobloxRoleSync({ environment = process.env, fetchImpl = global.fetch } = {}) {
  const groupId = environment.ROBLOX_COMMUNITY_ID;

  function configured() {
    return Boolean(groupId);
  }

  async function request(url, options) {
    const response = await fetchImpl(url, options);
    if (!response.ok) throw new Error(`Roblox returned HTTP ${response.status}`);
    return response.json();
  }

  async function resolveUser(username) {
    const result = await request('https://users.roblox.com/v1/usernames/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usernames: [username], excludeBannedUsers: true }),
    });
    const user = result.data?.[0];
    if (!user) throw new Error(`Roblox user “${username}” was not found`);
    return user;
  }

  async function groupRoles() {
    const result = await request(`https://groups.roblox.com/v1/groups/${groupId}/roles`);
    return result.roles ?? [];
  }

  async function membership(userId) {
    const result = await request(`https://groups.roblox.com/v2/users/${userId}/groups/roles`);
    return result.data?.find((entry) => String(entry.group?.id) === String(groupId));
  }

  async function syncMember(member, username) {
    if (!configured()) throw new Error('ROBLOX_COMMUNITY_ID is not configured');
    const [user, availableRoles] = await Promise.all([resolveUser(username), groupRoles()]);
    const groupMembership = await membership(user.id);
    if (!groupMembership) throw new Error(`${user.name} is not a member of the Delta Roblox Community`);

    const managedNames = new Set(availableRoles
      .filter((role) => role.rank > 0)
      .map((role) => normalizedRoleName(role.name)));
    const desiredName = normalizedRoleName(groupMembership.role.name);
    const guildRoles = member.guild.roles.cache;
    const desiredRole = guildRoles.find((role) => normalizedRoleName(role.name) === desiredName);
    if (!desiredRole) {
      throw new Error(`No Discord role matches Roblox rank “${groupMembership.role.name}”`);
    }
    if (!desiredRole.editable) throw new Error(`The bot cannot manage ${desiredRole.name}; move its role higher`);

    const obsolete = member.roles.cache.filter((role) =>
      role.id !== desiredRole.id && managedNames.has(normalizedRoleName(role.name)) && role.editable);
    if (obsolete.size) await member.roles.remove(obsolete, 'Synchronize Delta Roblox Community rank');
    if (!member.roles.cache.has(desiredRole.id)) {
      await member.roles.add(desiredRole, 'Synchronize Delta Roblox Community rank');
    }
    if (member.displayName !== user.name && member.manageable) {
      await member.setNickname(user.name, 'Record Leadership-approved Roblox username');
    }
    return { user, role: desiredRole, robloxRole: groupMembership.role };
  }

  return { configured, syncMember };
}

module.exports = { createRobloxRoleSync, normalizedRoleName, ROBLOX_COMMUNITY_URL };

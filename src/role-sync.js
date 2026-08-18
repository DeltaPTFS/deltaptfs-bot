function createRoleSyncService({ config, roblox }) {
  async function sync(member, robloxUserId, effectiveConfig = config) {
    const membership = await roblox.getGroupMembership(robloxUserId, effectiveConfig.robloxGroupId);
    const mappedIds = membership
      ? effectiveConfig.roleMappings[String(membership.role?.id)] ?? []
      : [];
    const desiredIds = new Set(mappedIds);
    const managedIds = new Set(effectiveConfig.managedRoleIds);
    const botMember = member.guild.members.me ?? await member.guild.members.fetchMe();
    const added = [];
    const removed = [];

    for (const roleId of desiredIds) {
      const role = await member.guild.roles.fetch(roleId);
      if (!role) throw new Error(`Configured Discord role ${roleId} does not exist`);
      if (role.position >= botMember.roles.highest.position || role.managed) {
        throw new Error(`The bot cannot manage ${role.name}; move the bot role higher`);
      }
      if (!member.roles.cache.has(role.id)) {
        await member.roles.add(role, 'Synchronize verified Roblox Community rank');
        added.push(role);
      }
    }

    for (const roleId of managedIds) {
      if (desiredIds.has(roleId) || !member.roles.cache.has(roleId)) continue;
      const role = member.guild.roles.cache.get(roleId) ?? await member.guild.roles.fetch(roleId);
      if (!role || role.managed || role.position >= botMember.roles.highest.position) {
        throw new Error(`The bot cannot remove managed role ${role?.name ?? roleId}`);
      }
      await member.roles.remove(role, 'Remove obsolete verified Roblox Community rank');
      removed.push(role);
    }

    return { membership, added, removed };
  }

  async function removeManaged(member, effectiveConfig = config) {
    const ids = new Set([...effectiveConfig.managedRoleIds, ...(effectiveConfig.verifiedRoleId ? [effectiveConfig.verifiedRoleId] : [])]);
    const botMember = member.guild.members.me ?? await member.guild.members.fetchMe();
    const removed = [];
    for (const roleId of ids) {
      if (!member.roles.cache.has(roleId)) continue;
      const role = member.guild.roles.cache.get(roleId) ?? await member.guild.roles.fetch(roleId);
      if (!role || role.managed || role.position >= botMember.roles.highest.position) {
        throw new Error(`The bot cannot remove ${role?.name ?? roleId}; move the bot role higher`);
      }
      await member.roles.remove(role, 'Unlink Roblox verification');
      removed.push(role);
    }
    return removed;
  }

  return { removeManaged, sync };
}

module.exports = { createRoleSyncService };

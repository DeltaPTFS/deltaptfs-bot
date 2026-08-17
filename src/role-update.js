const EXECUTIVES_ROLE_ID = '1533718284615291042';
const COLORS = Object.freeze({ error: 0xC8102E, info: 0x236192, success: 0x2E8540 });

function result(title, description, color = COLORS.error) {
  return { ok: false, embed: { color, title, description } };
}

function validateRoleUpdate({ guild, caller, target, requestedRole, botMember }) {
  const executiveRole = guild.roles.cache.get(EXECUTIVES_ROLE_ID);
  if (!executiveRole || caller.roles.highest.position < executiveRole.position) {
    return result('❌ Access Denied', 'You must be an Executive or higher to use `/update`.');
  }

  if (target.id === guild.ownerId) {
    return result('❌ Unable to Update Member', 'The server owner cannot be modified with this command.');
  }

  if (requestedRole.position >= caller.roles.highest.position) {
    return result(
      '❌ Insufficient Permissions',
      `You cannot assign ${requestedRole} because that role is equal to or higher than your highest role.`,
    );
  }

  if (requestedRole.position >= botMember.roles.highest.position) {
    return result(
      '❌ Unable to Assign Role',
      `My Discord bot role must be positioned above ${requestedRole} before I can assign it.`,
    );
  }

  if (requestedRole.id === guild.roles.everyone.id) {
    return result('❌ Unable to Assign Role', '`@everyone` cannot be assigned with this command.');
  }

  if (requestedRole.managed) {
    return result('❌ Unable to Assign Role', `${requestedRole} is managed by Discord or an integration and cannot be assigned manually.`);
  }

  if (target.roles.cache.has(requestedRole.id)) {
    return result('ℹ️ No Changes Required', `${target} already has ${requestedRole}.`, COLORS.info);
  }

  return { ok: true };
}

function successEmbed(target, requestedRole, caller) {
  return {
    color: COLORS.success,
    title: '✅ Member Updated',
    fields: [
      { name: 'Member', value: `${target}`, inline: true },
      { name: 'Role Added', value: `${requestedRole}`, inline: true },
      { name: 'Updated By', value: `${caller}`, inline: true },
    ],
  };
}

module.exports = { COLORS, EXECUTIVES_ROLE_ID, successEmbed, validateRoleUpdate };

function parseIdList(value, name) {
  if (!value?.trim()) return [];
  let parsed;
  try { parsed = JSON.parse(value); } catch { parsed = value.split(',').map((entry) => entry.trim()); }
  if (!Array.isArray(parsed) || parsed.some((id) => !/^\d+$/.test(String(id)))) {
    throw new Error(`${name} must be a JSON array or comma-separated list of Discord role IDs`);
  }
  return parsed.map(String);
}

function parseRoleMappings(value) {
  if (!value?.trim()) return {};
  let parsed;
  try { parsed = JSON.parse(value); } catch { throw new Error('ROLE_MAPPINGS must be a JSON object of Roblox role IDs to Discord role IDs'); }
  const validValue = (value) => (Array.isArray(value) ? value : [value])
    .every((roleId) => /^\d+$/.test(String(roleId)));
  if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object'
    || Object.entries(parsed).some(([rankId, roleIds]) => !/^\d+$/.test(rankId) || !validValue(roleIds))) {
    throw new Error('ROLE_MAPPINGS must contain numeric Roblox role ID keys and Discord role ID value(s)');
  }
  return Object.fromEntries(Object.entries(parsed).map(([key, value]) => [
    String(key), (Array.isArray(value) ? value : [value]).map(String),
  ]));
}

function loadConfig(environment = process.env) {
  const roleMappings = parseRoleMappings(environment.ROLE_MAPPINGS);
  const additionallyAuthorizedUpdateRoles = parseIdList(environment.UPDATE_ALLOWED_ROLE_IDS, 'UPDATE_ALLOWED_ROLE_IDS');
  return Object.freeze({
    databaseUrl: environment.DATABASE_URL || environment.POSTGRES_URL || environment.POSTGRESQL_URL,
    executiveRoleId: environment.EXECUTIVE_ROLE_ID || '1533718284615291042',
    updateAllowedRoleIds: [...new Set([
      '1539005023995043880',
      '1539005027748945971',
      ...additionallyAuthorizedUpdateRoles,
    ])],
    authenticatedRoleId: environment.AUTHENTICATED_ROLE_ID,
    unauthenticatedRoleId: environment.UNAUTHENTICATED_ROLE_ID,
    guildId: environment.GUILD_ID,
    logChannelId: environment.LOG_CHANNEL_ID,
    robloxGroupId: environment.ROBLOX_GROUP_ID || environment.ROBLOX_COMMUNITY_ID,
    robloxOauthClientId: environment.ROBLOX_OAUTH_CLIENT_ID,
    robloxOauthClientSecret: environment.ROBLOX_OAUTH_CLIENT_SECRET,
    robloxOauthRedirectUri: environment.ROBLOX_OAUTH_REDIRECT_URI,
    authenticationApiKey: environment.AUTHENTICATION_API_KEY,
    roleMappings,
    managedRoleIds: [...new Set([
      ...parseIdList(environment.MANAGED_ROLE_IDS, 'MANAGED_ROLE_IDS'),
      ...Object.values(roleMappings).flat(),
    ])],
  });
}

function mergeGuildConfig(base, stored) {
  if (!stored) return base;
  const roleMappings = { ...base.roleMappings, ...stored.roleMappings };
  return {
    ...base,
    ...stored,
    roleMappings,
    managedRoleIds: [...new Set([...base.managedRoleIds, ...stored.managedRoleIds])],
  };
}

module.exports = { loadConfig, mergeGuildConfig, parseIdList, parseRoleMappings };

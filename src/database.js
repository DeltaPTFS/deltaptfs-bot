function createDatabase(databaseUrl, PoolClass = null) {
  if (!databaseUrl) {
    const unavailable = async () => { throw new Error('DATABASE_URL is not configured'); };
    return { configured: false, init: unavailable, createPending: unavailable, consumePending: unavailable, saveVerification: unavailable, getByDiscordId: unavailable, getByRobloxId: unavailable, unlink: unavailable, logRoleAction: unavailable, getGuildConfig: unavailable, saveGuildConfig: unavailable, addRoleMapping: unavailable, removeRoleMapping: unavailable, close: async () => {} };
  }
  const DatabasePool = PoolClass ?? require('pg').Pool;
  const pool = new DatabasePool({ connectionString: databaseUrl, ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined });

  async function init() {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS verifications (
        discord_user_id BIGINT PRIMARY KEY,
        roblox_user_id BIGINT UNIQUE NOT NULL,
        roblox_username TEXT NOT NULL,
        rp_name TEXT,
        verified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS verification_sessions (
        state_hash TEXT PRIMARY KEY,
        discord_user_id BIGINT NOT NULL,
        guild_id BIGINT NOT NULL,
        expected_roblox_user_id BIGINT NOT NULL,
        code_verifier TEXT,
        rp_name TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        expires_at TIMESTAMPTZ NOT NULL
      );
      ALTER TABLE verification_sessions ADD COLUMN IF NOT EXISTS code_verifier TEXT;
      ALTER TABLE verification_sessions ADD COLUMN IF NOT EXISTS rp_name TEXT;
      ALTER TABLE verifications ADD COLUMN IF NOT EXISTS rp_name TEXT;
      CREATE TABLE IF NOT EXISTS role_update_logs (
        id BIGSERIAL PRIMARY KEY,
        target_discord_user_id BIGINT NOT NULL,
        target_username TEXT NOT NULL,
        executor_discord_user_id BIGINT NOT NULL,
        executor_username TEXT NOT NULL,
        discord_role_id BIGINT,
        discord_role_name TEXT,
        action TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS verification_sessions_expiry_idx ON verification_sessions(expires_at);
      CREATE TABLE IF NOT EXISTS guild_verification_config (
        guild_id BIGINT PRIMARY KEY,
        verified_role_id BIGINT NOT NULL,
        unverified_role_id BIGINT NOT NULL,
        log_channel_id BIGINT,
        roblox_group_id BIGINT NOT NULL,
        updated_by BIGINT NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS guild_role_mappings (
        guild_id BIGINT NOT NULL REFERENCES guild_verification_config(guild_id) ON DELETE CASCADE,
        roblox_role_id BIGINT NOT NULL,
        discord_role_id BIGINT NOT NULL,
        PRIMARY KEY (guild_id, roblox_role_id, discord_role_id)
      );
    `);
  }

  async function createPending(session) {
    await pool.query('DELETE FROM verification_sessions WHERE expires_at < NOW() OR discord_user_id = $1', [session.discordUserId]);
    await pool.query(`INSERT INTO verification_sessions
      (state_hash, discord_user_id, guild_id, expected_roblox_user_id, code_verifier, rp_name, expires_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW() + INTERVAL '10 minutes')`,
    [session.stateHash, session.discordUserId, session.guildId, session.robloxUserId, session.codeVerifier, session.rpName]);
  }

  async function consumePending(stateHash) {
    const result = await pool.query(`DELETE FROM verification_sessions
      WHERE state_hash = $1 AND expires_at > NOW()
      RETURNING discord_user_id, guild_id, expected_roblox_user_id, code_verifier, rp_name`, [stateHash]);
    return result.rows[0] ?? null;
  }

  async function saveVerification(record) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const conflicts = await client.query(`SELECT discord_user_id, roblox_user_id FROM verifications
        WHERE discord_user_id = $1 OR roblox_user_id = $2 FOR UPDATE`, [record.discordUserId, record.robloxUserId]);
      if (conflicts.rows.some((row) => String(row.discord_user_id) !== String(record.discordUserId)
        || String(row.roblox_user_id) !== String(record.robloxUserId))) {
        const error = new Error('That Discord or Roblox account is already linked to another account');
        error.code = 'DUPLICATE_VERIFICATION';
        throw error;
      }
      const result = await client.query(`INSERT INTO verifications
        (discord_user_id, roblox_user_id, roblox_username, rp_name, verified_at, updated_at)
        VALUES ($1, $2, $3, $4, NOW(), NOW())
        ON CONFLICT (discord_user_id) DO UPDATE SET
          roblox_user_id = EXCLUDED.roblox_user_id,
          roblox_username = EXCLUDED.roblox_username,
          rp_name = COALESCE(EXCLUDED.rp_name, verifications.rp_name),
          updated_at = NOW()
        RETURNING *`, [record.discordUserId, record.robloxUserId, record.robloxUsername, record.rpName ?? null]);
      await client.query('COMMIT');
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      if (error.code === '23505') error.code = 'DUPLICATE_VERIFICATION';
      throw error;
    } finally { client.release(); }
  }

  const one = async (sql, values) => (await pool.query(sql, values)).rows[0] ?? null;
  const getByDiscordId = (id) => one('SELECT * FROM verifications WHERE discord_user_id = $1', [id]);
  const getByRobloxId = (id) => one('SELECT * FROM verifications WHERE roblox_user_id = $1', [id]);
  async function unlink(discordUserId) {
    return one('DELETE FROM verifications WHERE discord_user_id = $1 RETURNING *', [discordUserId]);
  }
  async function logRoleAction(entry) {
    await pool.query(`INSERT INTO role_update_logs
      (target_discord_user_id, target_username, executor_discord_user_id, executor_username, discord_role_id, discord_role_name, action)
      VALUES ($1,$2,$3,$4,$5,$6,$7)`, [entry.targetId, entry.targetUsername, entry.executorId, entry.executorUsername, entry.roleId ?? null, entry.roleName ?? null, entry.action]);
  }
  async function getGuildConfig(guildId) {
    const core = await one('SELECT * FROM guild_verification_config WHERE guild_id = $1', [guildId]);
    if (!core) return null;
    const mappings = await pool.query('SELECT roblox_role_id, discord_role_id FROM guild_role_mappings WHERE guild_id = $1', [guildId]);
    const roleMappings = {};
    for (const row of mappings.rows) {
      (roleMappings[String(row.roblox_role_id)] ??= []).push(String(row.discord_role_id));
    }
    return {
      guildId: String(core.guild_id),
      verifiedRoleId: String(core.verified_role_id),
      unverifiedRoleId: String(core.unverified_role_id),
      logChannelId: core.log_channel_id ? String(core.log_channel_id) : null,
      robloxGroupId: String(core.roblox_group_id),
      roleMappings,
      managedRoleIds: [...new Set(Object.values(roleMappings).flat())],
    };
  }
  async function saveGuildConfig(entry) {
    await pool.query(`INSERT INTO guild_verification_config
      (guild_id, verified_role_id, unverified_role_id, log_channel_id, roblox_group_id, updated_by, updated_at)
      VALUES ($1,$2,$3,$4,$5,$6,NOW())
      ON CONFLICT (guild_id) DO UPDATE SET verified_role_id=EXCLUDED.verified_role_id,
      unverified_role_id=EXCLUDED.unverified_role_id, log_channel_id=EXCLUDED.log_channel_id,
      roblox_group_id=EXCLUDED.roblox_group_id, updated_by=EXCLUDED.updated_by, updated_at=NOW()`,
    [entry.guildId, entry.verifiedRoleId, entry.unverifiedRoleId, entry.logChannelId, entry.robloxGroupId, entry.updatedBy]);
    return getGuildConfig(entry.guildId);
  }
  async function addRoleMapping(guildId, robloxRoleId, discordRoleId) {
    await pool.query(`INSERT INTO guild_role_mappings (guild_id, roblox_role_id, discord_role_id)
      VALUES ($1,$2,$3) ON CONFLICT DO NOTHING`, [guildId, robloxRoleId, discordRoleId]);
    return getGuildConfig(guildId);
  }
  async function removeRoleMapping(guildId, robloxRoleId, discordRoleId = null) {
    await pool.query(`DELETE FROM guild_role_mappings WHERE guild_id=$1 AND roblox_role_id=$2
      AND ($3::BIGINT IS NULL OR discord_role_id=$3)`, [guildId, robloxRoleId, discordRoleId]);
    return getGuildConfig(guildId);
  }
  return { configured: true, init, createPending, consumePending, saveVerification, getByDiscordId, getByRobloxId, unlink, logRoleAction, getGuildConfig, saveGuildConfig, addRoleMapping, removeRoleMapping, close: () => pool.end() };
}

module.exports = { createDatabase };

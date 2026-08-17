function createDatabase(databaseUrl, PoolClass = null) {
  if (!databaseUrl) {
    const unavailable = async () => { throw new Error('DATABASE_URL is not configured'); };
    return { configured: false, init: unavailable, createPending: unavailable, consumePending: unavailable, saveVerification: unavailable, getByDiscordId: unavailable, getByRobloxId: unavailable, unlink: unavailable, logRoleAction: unavailable, close: async () => {} };
  }
  const DatabasePool = PoolClass ?? require('pg').Pool;
  const pool = new DatabasePool({ connectionString: databaseUrl, ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined });

  async function init() {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS verifications (
        discord_user_id BIGINT PRIMARY KEY,
        roblox_user_id BIGINT UNIQUE NOT NULL,
        roblox_username TEXT NOT NULL,
        verified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS verification_sessions (
        state_hash TEXT PRIMARY KEY,
        discord_user_id BIGINT NOT NULL,
        guild_id BIGINT NOT NULL,
        expected_roblox_user_id BIGINT NOT NULL,
        code_verifier TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        expires_at TIMESTAMPTZ NOT NULL
      );
      ALTER TABLE verification_sessions ADD COLUMN IF NOT EXISTS code_verifier TEXT;
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
    `);
  }

  async function createPending(session) {
    await pool.query('DELETE FROM verification_sessions WHERE expires_at < NOW() OR discord_user_id = $1', [session.discordUserId]);
    await pool.query(`INSERT INTO verification_sessions
      (state_hash, discord_user_id, guild_id, expected_roblox_user_id, code_verifier, expires_at)
      VALUES ($1, $2, $3, $4, $5, NOW() + INTERVAL '10 minutes')`,
    [session.stateHash, session.discordUserId, session.guildId, session.robloxUserId, session.codeVerifier]);
  }

  async function consumePending(stateHash) {
    const result = await pool.query(`DELETE FROM verification_sessions
      WHERE state_hash = $1 AND expires_at > NOW()
      RETURNING discord_user_id, guild_id, expected_roblox_user_id, code_verifier`, [stateHash]);
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
        (discord_user_id, roblox_user_id, roblox_username, verified_at, updated_at)
        VALUES ($1, $2, $3, NOW(), NOW())
        ON CONFLICT (discord_user_id) DO UPDATE SET
          roblox_user_id = EXCLUDED.roblox_user_id,
          roblox_username = EXCLUDED.roblox_username,
          updated_at = NOW()
        RETURNING *`, [record.discordUserId, record.robloxUserId, record.robloxUsername]);
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
  return { configured: true, init, createPending, consumePending, saveVerification, getByDiscordId, getByRobloxId, unlink, logRoleAction, close: () => pool.end() };
}

module.exports = { createDatabase };

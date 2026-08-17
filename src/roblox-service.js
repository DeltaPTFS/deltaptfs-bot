const API_TIMEOUT_MS = 8000;

function createRobloxService({ fetchImpl = global.fetch, groupId } = {}) {
  async function request(url, options = {}, attempt = 0) {
    let response;
    try {
      response = await fetchImpl(url, { ...options, signal: AbortSignal.timeout(API_TIMEOUT_MS) });
    } catch (error) {
      throw new Error(error.name === 'TimeoutError' ? 'Roblox API request timed out' : `Roblox API request failed: ${error.message}`);
    }
    if (response.status === 429 && attempt < 2) {
      const seconds = Math.min(Number(response.headers?.get?.('retry-after')) || 1, 5);
      await new Promise((resolve) => setTimeout(resolve, seconds * 1000));
      return request(url, options, attempt + 1);
    }
    if (!response.ok) throw new Error(`Roblox API returned HTTP ${response.status}`);
    return response.json();
  }

  async function getUserByUsername(username) {
    const cleaned = username.trim();
    if (!/^[A-Za-z0-9_]{3,20}$/.test(cleaned)) throw new Error('Enter a valid Roblox username');
    const data = await request('https://users.roblox.com/v1/usernames/users', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usernames: [cleaned], excludeBannedUsers: true }),
    });
    if (!data.data?.[0]) throw new Error(`Roblox user “${cleaned}” was not found`);
    return data.data[0];
  }
  async function getUsernameFromUserId(userId) {
    const user = await request(`https://users.roblox.com/v1/users/${userId}`);
    if (!user?.name) throw new Error('Roblox account was deleted or unavailable');
    return user;
  }
  async function getUserGroups(userId) {
    const data = await request(`https://groups.roblox.com/v2/users/${userId}/groups/roles`);
    return data.data ?? [];
  }
  async function getGroupMembership(userId) {
    if (!groupId) throw new Error('ROBLOX_GROUP_ID is not configured');
    return (await getUserGroups(userId)).find((entry) => String(entry.group?.id) === String(groupId)) ?? null;
  }
  return { getUserByUsername, getUsernameFromUserId, getUserGroups, getGroupMembership, request };
}

module.exports = { API_TIMEOUT_MS, createRobloxService };

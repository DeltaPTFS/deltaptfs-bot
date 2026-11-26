'use strict';
const { escapeMarkdown } = require('discord.js');
const GUILD_ID = '1538738611988467782';
const CHANNEL_ID = '1539005101941850274';
const BASE_URL = 'https://roblox-delta-web.vercel.app';
const MARKER = 'Website Deployment ID:';
const POLL_MS = 5 * 60 * 1000;
const monitors = new WeakMap();

async function checkWebsiteRelease(client, {fetchImpl = globalThis.fetch, lastSeen = null} = {}) {
  if (!client.isReady()) return lastSeen;
  const response = await fetchImpl(BASE_URL + '/release-info', {
    redirect: 'error', headers: {'Cache-Control':'no-cache'}, signal: AbortSignal.timeout(15000)
  });
  if (!response.ok) throw new Error('Production metadata unavailable: HTTP ' + response.status);
  const data = await response.json();
  if (!data || data.environment !== 'production' || typeof data.commit !== 'string' || !/^[a-f0-9]{40}$/.test(data.commit)) throw new Error('Invalid production metadata');
  const sha = data.commit;
  if (sha === lastSeen) return lastSeen;
  const channel = await client.channels.fetch(CHANNEL_ID);
  if (!channel || channel.guildId !== GUILD_ID || !channel.isTextBased() || typeof channel.send !== 'function' || !channel.messages) throw new Error('Designated release channel unavailable');
  const marker = MARKER + ' `' + sha + '`';
  // Check bot-authored deployment notices, including those from the retired HelpDesk monitor.
  // Never send blindly when history is inaccessible.
  let before;
  for (let page = 0; page < 5; page++) {
    const history = await channel.messages.fetch({limit:100,...(before ? {before} : {})});
    if (history.some(message => message.author?.bot && message.content?.includes(marker))) return sha;
    if (history.size < 100) break;
    before = history.last()?.id;
    if (!before) break;
  }
  const summary = escapeMarkdown(String(data.summary || 'Website update').slice(0,280).replace(/[\r\n]+/g,' '));
  await channel.send({
    content: '## <:DeltaLogo:1540927958116601980> Delta Website — Update\n\n> **' + summary + '**\n\n**Status:** Production deployment online\n**Website:** ' + BASE_URL + '\n-# ' + marker + '\n<:WingPinLogo:1540927847709802607> **Keep Climbing, Delta Air Lines.**',
    allowedMentions: {parse:[]}, flags: 4
  });
  return sha;
}

function startWebsiteReleaseMonitor(client) {
  if (monitors.has(client)) return monitors.get(client);
  let lastSeen = null, running = false;
  const tick = async () => {
    if (running) return;
    running = true;
    try { lastSeen = await checkWebsiteRelease(client,{lastSeen}); }
    catch (error) { console.warn('Website release check deferred:',error.message); }
    finally {running=false;}
  };
  const timer = setInterval(tick,POLL_MS);timer.unref();
  monitors.set(client,timer);void tick();
  return timer;
}
module.exports = {checkWebsiteRelease,startWebsiteReleaseMonitor,CHANNEL_ID,GUILD_ID,BASE_URL};

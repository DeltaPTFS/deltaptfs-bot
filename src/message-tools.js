const DEFAULT_DELTA_BLUE = 0x071D49;

function parseHexColor(value, fallback = DEFAULT_DELTA_BLUE) {
  if (!value) return fallback;
  const cleaned = value.trim().replace(/^#/, '');
  if (!/^[0-9a-fA-F]{6}$/.test(cleaned)) throw new Error('Hex color must contain exactly six hexadecimal characters, such as `#071D49`.');
  return Number.parseInt(cleaned, 16);
}

function parseEmoji(value, guild = null) {
  if (!value?.trim()) return null;
  const cleaned = value.trim();
  const custom = cleaned.match(/^<(a?):([A-Za-z0-9_]+):(\d+)>$/);
  if (custom) return { id: custom[3], name: custom[2], animated: Boolean(custom[1]) };
  const alias = cleaned.match(/^:([A-Za-z0-9_]+):$/);
  if (alias) {
    const found = guild?.emojis?.cache?.find((emoji) => emoji.name?.toLowerCase() === alias[1].toLowerCase());
    if (!found) throw new Error(`Custom emoji ${cleaned} was not found in this server. Select or paste the actual emoji.`);
    return { id: found.id, name: found.name, animated: found.animated };
  }
  return { name: cleaned };
}

function reactionKey(emoji) {
  return emoji.id ? `custom:${emoji.id}` : `unicode:${emoji.name}`;
}

function reactionInput(value, guild = null) {
  const emoji = parseEmoji(value, guild);
  if (!emoji) throw new Error('An emoji is required.');
  return {
    emoji,
    key: reactionKey(emoji),
    reactable: emoji.id ? `<${emoji.animated ? 'a' : ''}:${emoji.name}:${emoji.id}>` : emoji.name,
  };
}

function buildLinkButtonMessage({ text, label, url, emoji, hex }, guild = null) {
  let parsedUrl;
  try { parsedUrl = new URL(url); } catch { throw new Error('Link must be a valid HTTPS URL.'); }
  if (parsedUrl.protocol !== 'https:') throw new Error('Link buttons require an HTTPS URL.');
  const button = { type: 2, style: 5, label: label.trim().slice(0, 80), url: parsedUrl.toString() };
  const parsedEmoji = parseEmoji(emoji, guild);
  if (parsedEmoji) button.emoji = parsedEmoji;
  return {
    embeds: [{ color: parseHexColor(hex), description: text.trim().slice(0, 4096) }],
    components: [{ type: 1, components: [button] }],
  };
}

function buildLinkButton({ label, url, emoji }, guild = null) {
  let parsedUrl;
  try { parsedUrl = new URL(url); } catch { throw new Error('Link must be a valid HTTPS URL.'); }
  if (parsedUrl.protocol !== 'https:') throw new Error('Link buttons require an HTTPS URL.');
  const cleanedLabel = label.trim();
  if (!cleanedLabel) throw new Error('Button label cannot be empty.');
  const button = { type: 2, style: 5, label: cleanedLabel.slice(0, 80), url: parsedUrl.toString() };
  const parsedEmoji = parseEmoji(emoji, guild);
  if (parsedEmoji) button.emoji = parsedEmoji;
  return button;
}

function addLinkButtonToMessage(message, options, guild = null) {
  const components = message.components.map((row) => row.toJSON());
  const button = buildLinkButton(options, guild);
  let row = components.find((candidate) => candidate.components.length < 5);
  if (!row) {
    if (components.length >= 5) throw new Error('That message already has the maximum number of component rows.');
    row = { type: 1, components: [] };
    components.push(row);
  }
  row.components.push(button);

  const embeds = message.embeds.map((embed) => embed.toJSON());
  const color = parseHexColor(options.hex);
  if (embeds.length) embeds[0].color = color;
  else embeds.push({ color, description: '\u200b' });
  return { embeds, components };
}

module.exports = {
  DEFAULT_DELTA_BLUE,
  addLinkButtonToMessage,
  buildLinkButton,
  buildLinkButtonMessage,
  parseEmoji,
  parseHexColor,
  reactionInput,
  reactionKey,
};

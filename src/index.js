require('dotenv/config');

const {
  ChannelType,
  Client,
  Events,
  GatewayIntentBits,
  PermissionFlagsBits,
  SlashCommandBuilder,
} = require('discord.js');
const { SERVER_LAYOUT, formatLayout } = require('./layout');
const { formatRoles, roleDefinitions } = require('./roles');
const {
  awardMiles,
  getBalance,
  getLeaderboard,
  isSheetsConfigured,
} = require('./sheets');
const { startHealthServer } = require('./health');
const { INFO_MESSAGES, infoMessagePayload, missingBannerEnvironmentKeys } = require('./info');
const { loadConfig, mergeGuildConfig } = require('./config');
const { createDatabase } = require('./database');
const { createRobloxService } = require('./roblox-service');
const { createRoleSyncService } = require('./role-sync');
const { createAuthenticationService, formatAuthenticatedNickname, validateRpName } = require('./authentication-service');
const { authenticationPanelPayloads } = require('./authentication-panel');
const { successEmbed, validateExecutiveAccess, validateRoleUpdate } = require('./role-update');
const { version: botVersion } = require('../package.json');

const token = process.env.DISCORD_TOKEN;

if (!token) {
  console.error('DISCORD_TOKEN is required. Add it to your environment before starting the bot.');
  process.exit(1);
}

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers] });
const config = loadConfig();
const database = createDatabase(config.databaseUrl);
async function effectiveGuildConfig(guildId) {
  if (!database.configured) return config;
  return mergeGuildConfig(config, await database.getGuildConfig(guildId));
}
const roblox = createRobloxService({ groupId: config.robloxGroupId });
const roleSync = createRoleSyncService({ config, roblox });
const authentication = createAuthenticationService({ config, database, roblox, roleSync, client, getGuildConfig: effectiveGuildConfig });
const health = startHealthServer({ requestHandler: authentication.handleRequest });

const setupCommand = new SlashCommandBuilder()
  .setName('setup')
  .setDescription('Preview or apply Delta Airlines roles, channels, or both')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .addStringOption((option) =>
    option
      .setName('mode')
      .setDescription('Preview the complete setup first, or apply it to this server')
      .setRequired(true)
      .addChoices(
        { name: 'Preview only', value: 'preview' },
        { name: 'Apply layout', value: 'apply' },
      ),
  )
  .addStringOption((option) =>
    option
      .setName('section')
      .setDescription('Choose which part of the server setup to process')
      .setRequired(true)
      .addChoices(
        { name: 'Categories and channels only', value: 'channels' },
        { name: 'Roles only', value: 'roles' },
        { name: 'Roles and categories/channels', value: 'both' },
      ),
  );

const skyMilesCommand = new SlashCommandBuilder()
  .setName('skymiles')
  .setDescription('View or manage the virtual SkyMiles ledger')
  .addSubcommand((subcommand) => subcommand
    .setName('balance')
    .setDescription('View a member’s virtual SkyMiles balance')
    .addUserOption((option) => option.setName('member').setDescription('Member to view')))
  .addSubcommand((subcommand) => subcommand
    .setName('leaderboard')
    .setDescription('View the virtual SkyMiles leaderboard'))
  .addSubcommand((subcommand) => subcommand
    .setName('award')
    .setDescription('Award or deduct virtual SkyMiles (Manage Server only)')
    .addUserOption((option) => option.setName('member').setDescription('Member to update').setRequired(true))
    .addIntegerOption((option) => option.setName('miles').setDescription('Positive award or negative correction').setRequired(true))
    .addStringOption((option) => option.setName('flight-id').setDescription('Flight or event identifier').setRequired(true))
    .addStringOption((option) => option.setName('reason').setDescription('Reason for the ledger entry').setRequired(true)));

const versionCommand = new SlashCommandBuilder()
  .setName('bot-version')
  .setDescription('Show the deployed Delta Virtual Assistant version');

const infoCommand = new SlashCommandBuilder()
  .setName('info')
  .setDescription('Post the complete Delta welcome and information sequence')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);

for (const message of INFO_MESSAGES) {
  infoCommand.addAttachmentOption((option) => option
    .setName(message.banner)
    .setDescription(`Upload the ${message.banner.replaceAll('-', ' ')} banner shown with this section`));
}

const updateCommand = new SlashCommandBuilder()
  .setName('update')
  .setDescription('Assign a managed role to a member (Executives and higher)')
  .addUserOption((option) => option.setName('user').setDescription('Discord member to update').setRequired(true))
  .addRoleOption((option) => option.setName('role').setDescription('Role to add').setRequired(true));

const getRoleCommand = new SlashCommandBuilder()
  .setName('getrole')
  .setDescription('Synchronize roles for your authenticated Roblox account');

const authenticateCommand = new SlashCommandBuilder()
  .setName('authenticate')
  .setDescription('Securely authenticate ownership of your Roblox account')
  .addStringOption((option) => option.setName('roblox-username').setDescription('Your exact Roblox username').setRequired(true));

const unlinkCommand = new SlashCommandBuilder()
  .setName('unlink')
  .setDescription('Unlink a member’s Roblox authentication (Executives and higher)')
  .addUserOption((option) => option.setName('user').setDescription('Authenticated Discord member to unlink').setRequired(true));

const authenticationConfigCommand = new SlashCommandBuilder()
  .setName('authentication-config')
  .setDescription('Configure Delta Air Lines authentication for this server')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .addSubcommand((subcommand) => subcommand.setName('status').setDescription('Check database and OAuth configuration'))
  .addSubcommand((subcommand) => subcommand.setName('view').setDescription('View authentication configuration'))
  .addSubcommand((subcommand) => subcommand.setName('set').setDescription('Set core authentication configuration')
    .addRoleOption((option) => option.setName('authenticated-role').setDescription('Role granted after authentication').setRequired(true))
    .addRoleOption((option) => option.setName('unauthenticated-role').setDescription('Role removed after authentication').setRequired(true))
    .addStringOption((option) => option.setName('roblox-group-id').setDescription('Numeric Delta Roblox group ID').setRequired(true))
    .addChannelOption((option) => option.setName('log-channel').setDescription('Staff authentication and role audit channel')))
  .addSubcommand((subcommand) => subcommand.setName('mapping-add').setDescription('Map a Roblox group role to a Discord role')
    .addStringOption((option) => option.setName('roblox-role-id').setDescription('Numeric Roblox group-role ID').setRequired(true))
    .addRoleOption((option) => option.setName('discord-role').setDescription('Discord role to synchronize').setRequired(true)))
  .addSubcommand((subcommand) => subcommand.setName('mapping-remove').setDescription('Remove a Roblox role mapping')
    .addStringOption((option) => option.setName('roblox-role-id').setDescription('Numeric Roblox group-role ID').setRequired(true))
    .addRoleOption((option) => option.setName('discord-role').setDescription('Specific mapped role; omit to remove all mappings')));

const authenticationPanelCommand = new SlashCommandBuilder()
  .setName('authentication-panel')
  .setDescription('Post the Delta Air Lines authentication panel')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);

function normalizedName(name) {
  return name.toLowerCase().replaceAll(' ', '-');
}

function splitMessage(content, limit = 1900) {
  const chunks = [];
  let chunk = '';
  for (const line of content.split('\n')) {
    if (chunk && chunk.length + line.length + 1 > limit) {
      chunks.push(chunk);
      chunk = '';
    }
    chunk += `${chunk ? '\n' : ''}${line}`;
  }
  if (chunk) chunks.push(chunk);
  return chunks;
}

function categoryOverwrites(guild, categoryDefinition, rolesByName) {
  const unauthenticated = configuredRole(rolesByName, 'Unauthenticated');
  if (!categoryDefinition.accessRoles) {
    if (categoryDefinition.hideFromUnauthenticated && unauthenticated) {
      return [{ id: unauthenticated.id, deny: [PermissionFlagsBits.ViewChannel] }];
    }
    if (categoryDefinition.visibleToUnauthenticated && unauthenticated) {
      return [{ id: unauthenticated.id, allow: [PermissionFlagsBits.ViewChannel] }];
    }
    return [];
  }

  return [
    { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
    ...categoryDefinition.accessRoles.flatMap((name) => {
      const role = rolesByName.get(name.toLowerCase())
        ?? rolesByName.get(`${name} | delta air lines`.toLowerCase())
        ?? rolesByName.get(`${name} | delta airlines`.toLowerCase())
        ?? rolesByName.get(`${name} | delta ptfs`.toLowerCase());
      return role ? [{
      id: role.id,
      allow: [PermissionFlagsBits.ViewChannel],
      }] : [];
    }),
  ];
}

function configuredRole(rolesByName, name) {
  return rolesByName.get(`${name} | delta air lines`.toLowerCase())
    ?? rolesByName.get(`${name} | delta airlines`.toLowerCase())
    ?? rolesByName.get(`${name} | delta ptfs`.toLowerCase())
    ?? rolesByName.get(name.toLowerCase());
}

function channelOverwrites(guild, channelDefinition, rolesByName) {
  const unauthenticated = configuredRole(rolesByName, 'Unauthenticated');
  if (!unauthenticated) return undefined;
  return [{
    id: unauthenticated.id,
    ...(channelDefinition.visibleToUnauthenticated
      ? { allow: [PermissionFlagsBits.ViewChannel] }
      : { deny: [PermissionFlagsBits.ViewChannel] }),
  }];
}

async function findOrCreateCategory(guild, categoryDefinition, rolesByName) {
  let existing = guild.channels.cache.find(
    (channel) => channel.type === ChannelType.GuildCategory
      && channel.name.toLowerCase() === categoryDefinition.name.toLowerCase(),
  );
  if (!existing && categoryDefinition.legacyNames) {
    existing = guild.channels.cache.find((channel) => channel.type === ChannelType.GuildCategory
      && categoryDefinition.legacyNames.some((name) => channel.name.toLowerCase() === name.toLowerCase()));
    if (existing) await existing.setName(categoryDefinition.name, 'Rename Delta Airlines category');
  }
  const permissionOverwrites = categoryOverwrites(guild, categoryDefinition, rolesByName);
  if (existing) {
    if (categoryDefinition.accessRoles || categoryDefinition.hideFromUnauthenticated
      || categoryDefinition.visibleToUnauthenticated) {
      await existing.permissionOverwrites.set(
        permissionOverwrites,
        'Synchronize Delta Airlines category access',
      );
    }
    return { category: existing, created: false };
  }

  const category = await guild.channels.create({
    name: categoryDefinition.name,
    type: ChannelType.GuildCategory,
    permissionOverwrites,
    reason: 'Delta Airlines server setup',
  });
  return { category, created: true };
}

async function applyRoles(guild) {
  await guild.roles.fetch();
  await guild.members.fetchMe();
  const definitions = roleDefinitions();
  let created = 0;
  let skipped = 0;
  const warnings = [];

  // New roles start near the bottom and push earlier roles upward, so creating
  // the hierarchy from highest to lowest preserves its intended order.
  for (const definition of definitions) {
    let existing = guild.roles.cache.find(
      (role) => role.name.toLowerCase() === definition.name.toLowerCase(),
    );
    const legacyNames = definition.baseName
      ? [
        definition.baseName,
        `${definition.baseName} | Delta Airlines`,
        `${definition.baseName} | Delta PTFS`,
        ...(definition.baseName === 'Authenticated' ? ['Verified', 'Verified | Delta Air Lines'] : []),
        ...(definition.baseName === 'Unauthenticated' ? ['Unverified', 'Unverified | Delta Air Lines'] : []),
      ]
      : [];
    const legacyRole = guild.roles.cache.find((role) =>
      legacyNames.some((name) => role.name.toLowerCase() === name.toLowerCase()));
    if (!existing && legacyRole?.editable) {
      existing = await legacyRole.edit({
        name: definition.name,
        reason: 'Apply Delta Air Lines role naming format',
      });
    }
    if (existing) {
      skipped += 1;
      continue;
    }

    try {
      await guild.roles.create({
        name: definition.name,
        color: definition.color,
        hoist: definition.hoist ?? false,
        permissions: (definition.permissions ?? []).map((name) => PermissionFlagsBits[name]),
        reason: 'Delta Airlines server setup',
      });
    } catch (error) {
      error.setupStep = `creating role ${definition.name}`;
      throw error;
    }
    created += 1;
  }

  // Creation order alone is not a reliable role hierarchy once a server has
  // pre-existing roles. Explicitly position every member role above the
  // separator that belongs to it. Discord positions count upward from
  // @everyone, so the first definition receives the highest position.
  await guild.roles.fetch();
  const configuredRoles = definitions.map((definition) => guild.roles.cache.find(
    (role) => role.name.toLowerCase() === definition.name.toLowerCase(),
  ));
  const manageableRoles = configuredRoles.filter((role) => role.editable);
  const unmanageableRoles = configuredRoles.filter((role) => !role.editable);
  try {
    await guild.roles.setPositions(
      manageableRoles.map((role, index) => ({
        role: role.id,
        position: manageableRoles.length - index,
      })),
      'Order Delta Air Lines roles and category separators',
    );
  } catch (error) {
    if (error.code !== 50013) throw error;
    warnings.push(
      'Discord denied role reordering (50013), so channel setup continued without moving roles. '
      + 'Move the bot role higher to reorder them later.',
    );
  }

  const appDefinition = definitions.find((definition) => definition.app);
  const appRole = guild.roles.cache.find(
    (role) => role.name.toLowerCase() === appDefinition.name.toLowerCase(),
  );
  const botMember = guild.members.me ?? await guild.members.fetchMe();
  if (!botMember.roles.cache.has(appRole.id) && appRole.editable) {
    try {
      await botMember.roles.add(appRole);
    } catch (error) {
      if (error.code !== 50013) throw error;
      warnings.push('Discord denied assigning the Delta Virtual Assistant role (50013); setup continued.');
    }
  }

  if (unmanageableRoles.length) {
    warnings.push(`Could not reorder roles above the bot: ${unmanageableRoles.map(({ name }) => name).join(', ')}.`);
  }

  return {
    created,
    skipped,
    warnings,
  };
}

async function runSetupStep(step, operation) {
  try {
    return await operation();
  } catch (error) {
    error.setupStep ??= step;
    throw error;
  }
}

async function applyChannels(guild) {
  await guild.channels.fetch();
  await guild.roles.fetch();
  const rolesByName = new Map(
    guild.roles.cache.map((role) => [role.name.toLowerCase(), role]),
  );

  let categoriesCreated = 0;
  let channelsCreated = 0;
  let channelsSkipped = 0;
  const warnings = [];
  const requiredRoleNames = new Set([
    ...SERVER_LAYOUT.flatMap(({ accessRoles = [] }) => accessRoles),
    'Unauthenticated',
  ]);
  const missingRoles = [...requiredRoleNames].filter((name) =>
    !rolesByName.has(name.toLowerCase())
    && !rolesByName.has(`${name} | delta air lines`.toLowerCase())
    && !rolesByName.has(`${name} | delta airlines`.toLowerCase()));
  if (missingRoles.length) {
    warnings.push(
      `These access roles do not exist, so their channel overrides were skipped: ${missingRoles.join(', ')}. `
      + 'Run /setup with Roles only, then run Categories and channels only again.',
    );
  }

  for (const categoryDefinition of SERVER_LAYOUT) {
    const result = await runSetupStep(
      `creating category ${categoryDefinition.name}`,
      () => findOrCreateCategory(guild, categoryDefinition, rolesByName),
    );
    const category = result.category;
    if (result.created) categoriesCreated += 1;

    for (const channelDefinition of categoryDefinition.channels) {
      const type = channelDefinition.type === 'voice'
        ? ChannelType.GuildVoice
        : ChannelType.GuildText;
      const expectedName = normalizedName(channelDefinition.name);
      let existing = guild.channels.cache.find(
        (channel) => channel.parentId === category.id
          && channel.type === type
          && normalizedName(channel.name) === expectedName,
      );
      if (!existing && channelDefinition.legacyNames) {
        existing = guild.channels.cache.find((channel) => channel.type === type
          && channelDefinition.legacyNames.some((name) => normalizedName(channel.name) === normalizedName(name)));
        if (existing) {
          await existing.edit({
            name: channelDefinition.name,
            parent: category.id,
            topic: type === ChannelType.GuildText ? channelDefinition.topic : undefined,
            reason: 'Migrate Delta Airlines information channel',
          });
        }
      }
      if (!existing && channelDefinition.legacyCategory) {
        existing = guild.channels.cache.find((channel) => channel.type === type
          && normalizedName(channel.name) === expectedName);
        if (existing) await existing.setParent(category.id, { lockPermissions: false });
      }
      if (existing) {
        const permissionOverwrites = channelOverwrites(guild, channelDefinition, rolesByName);
        if (permissionOverwrites) {
          await runSetupStep(
            `updating permissions for ${existing.name}`,
            () => existing.permissionOverwrites.set(
              permissionOverwrites,
              'Synchronize Delta Airlines authentication visibility',
            ),
          );
        }
        channelsSkipped += 1;
        continue;
      }

      await runSetupStep(`creating channel ${channelDefinition.name}`, () => guild.channels.create({
          name: channelDefinition.name,
          type,
          parent: category.id,
          topic: type === ChannelType.GuildText ? channelDefinition.topic : undefined,
          permissionOverwrites: channelOverwrites(guild, channelDefinition, rolesByName),
          reason: 'Delta Airlines server setup',
        }));
      channelsCreated += 1;
    }
  }

  // Remove the retired frequency network and ATC category from older layouts.
  const legacyFrequencyCategories = guild.channels.cache.filter((channel) =>
    channel.type === ChannelType.GuildCategory
    && (channel.name.toLowerCase() === 'air traffic control'
      || channel.name.toLowerCase().includes('frequenc')));
  for (const legacyCategory of legacyFrequencyCategories.values()) {
    const legacyChildren = guild.channels.cache.filter(
      (channel) => channel.parentId === legacyCategory.id,
    );
    for (const legacyChannel of legacyChildren.values()) {
      await legacyChannel.delete('Remove retired Delta Airlines frequency channel');
    }
    await legacyCategory.delete('Remove retired Delta Airlines frequency category');
  }

  for (const retiredName of ['roles', 'faq', 'atc tower']) {
    const retiredChannels = guild.channels.cache.filter((channel) =>
      normalizedName(channel.name) === normalizedName(retiredName));
    for (const channel of retiredChannels.values()) {
      await channel.delete('Remove retired Delta Airlines channel');
    }
  }

  for (const [name, position] of [['INFORMATION CENTER', 0], ['AUTHENTICATION', 1]]) {
    const category = guild.channels.cache.find((channel) =>
      channel.type === ChannelType.GuildCategory && channel.name.toUpperCase() === name);
    if (category) await category.setPosition(position, { reason: 'Order Delta Airlines onboarding categories' });
  }

  return {
    categoriesCreated,
    channelsCreated,
    channelsSkipped,
    warnings,
  };
}

client.on(Events.GuildMemberAdd, async (member) => {
  if (member.user.bot) return;
  const guildConfig = await effectiveGuildConfig(member.guild.id).catch(() => config);
  const unauthenticated = (guildConfig.unauthenticatedRoleId && member.guild.roles.cache.get(guildConfig.unauthenticatedRoleId))
    || member.guild.roles.cache.find((role) =>
      ['unauthenticated | delta air lines', 'unauthenticated | delta airlines', 'unauthenticated']
        .includes(role.name.toLowerCase()));
  if (!unauthenticated?.editable) return;
  try {
    await member.roles.add(unauthenticated, 'New Delta Airlines member awaiting authentication');
  } catch (error) {
    console.error('Could not assign the Unauthenticated role:', error);
  }
});

client.on(Events.GuildMemberUpdate, async (oldMember, newMember) => {
  if (newMember.user.bot || oldMember.nickname === newMember.nickname || !database.configured) return;
  try {
    const record = await database.getByDiscordId(newMember.id);
    const expectedNickname = record?.rp_name && record?.roblox_username
      ? formatAuthenticatedNickname(record.rp_name, record.roblox_username)
      : null;
    if (expectedNickname && newMember.nickname !== expectedNickname && newMember.manageable) {
      await newMember.setNickname(expectedNickname, 'Authenticated RP names can only be changed through support');
    }
  } catch (error) {
    console.error('Could not enforce authenticated RP name:', error);
  }
});

client.once(Events.ClientReady, async (readyClient) => {
  if (database.configured) {
    try { await database.init(); } catch (error) { console.error('PostgreSQL initialization failed:', error); }
  } else {
    console.warn('DATABASE_URL is not configured; authentication commands are disabled.');
  }
  try {
    await readyClient.application.commands.set([
      setupCommand.toJSON(), skyMilesCommand.toJSON(), versionCommand.toJSON(), infoCommand.toJSON(),
      updateCommand.toJSON(), getRoleCommand.toJSON(), authenticateCommand.toJSON(), unlinkCommand.toJSON(),
      authenticationConfigCommand.toJSON(), authenticationPanelCommand.toJSON(),
    ]);
    health.markReady();
    console.log(`Ready as ${readyClient.user.tag} (version ${botVersion}). Commands are registered.`);
  } catch (error) {
    console.error('Discord command registration failed:', error);
  }
});

client.on(Events.Error, (error) => {
  console.error('Discord client error:', error);
});

async function handleSkyMiles(interaction) {
  if (!isSheetsConfigured()) {
    await interaction.reply({
      content: 'SkyMiles tracking is not connected yet. Configure the Google Sheets webhook first.',
      ephemeral: true,
    });
    return;
  }

  const subcommand = interaction.options.getSubcommand();
  await interaction.deferReply({ ephemeral: subcommand !== 'leaderboard' });
  try {
    if (subcommand === 'balance') {
      const member = interaction.options.getUser('member') ?? interaction.user;
      const result = await getBalance(member.id);
      await interaction.editReply(`**${member.displayName}** has **${result.balance.toLocaleString()}** virtual miles.`);
      return;
    }

    if (subcommand === 'leaderboard') {
      const result = await getLeaderboard();
      const lines = result.leaders.map((entry, index) =>
        `${index + 1}. **${entry.displayName || entry.userId}** — ${entry.balance.toLocaleString()}`);
      await interaction.editReply(lines.length ? `**Virtual SkyMiles Leaderboard**\n${lines.join('\n')}` : 'No awards have been recorded yet.');
      return;
    }

    if (!interaction.inGuild() || !interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
      await interaction.editReply('You need **Manage Server** to award or deduct miles.');
      return;
    }
    const member = interaction.options.getUser('member', true);
    const miles = interaction.options.getInteger('miles', true);
    const result = await awardMiles({
      userId: member.id,
      displayName: member.displayName,
      miles,
      flightId: interaction.options.getString('flight-id', true),
      reason: interaction.options.getString('reason', true),
      awardedById: interaction.user.id,
    });
    await interaction.editReply(`Recorded **${miles.toLocaleString()}** miles for **${member.displayName}**. New balance: **${result.balance.toLocaleString()}**.`);
  } catch (error) {
    console.error('SkyMiles request failed:', error);
    await interaction.editReply('The Google Sheets request failed. Check the deployment URL, secret, and Apps Script execution log.');
  }
}

async function handleInfo(interaction) {
  if (!interaction.inGuild() || !interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
    await interaction.reply({ content: 'You need **Manage Server** to post the information sequence.', ephemeral: true });
    return;
  }

  await interaction.deferReply({ ephemeral: true });
  for (const message of INFO_MESSAGES) {
    const uploadedBanner = interaction.options.getAttachment(message.banner);
    await interaction.channel.send(infoMessagePayload(
      message,
      process.env,
      uploadedBanner?.url,
      interaction.guild,
    ));
  }

  const uploadedBannerNames = new Set(
    INFO_MESSAGES
      .filter((message) => interaction.options.getAttachment(message.banner))
      .map((message) => message.bannerEnv),
  );
  const missingBanners = missingBannerEnvironmentKeys()
    .filter((key) => !uploadedBannerNames.has(key));
  const bannerNote = missingBanners.length
    ? ` Missing banner URL variables: ${missingBanners.join(', ')}.`
    : '';
  await interaction.editReply(`Posted ${INFO_MESSAGES.length} standalone information messages.${bannerNote}`);
}

function correctGuild(interaction) {
  if (!interaction.inGuild()) return false;
  if (client.guilds.cache.size === 1) return true;
  return !config.guildId || String(interaction.guildId) === String(config.guildId);
}

async function recordAudit(interaction, entry, embed) {
  console.info('Role audit:', JSON.stringify({ ...entry, timestamp: new Date().toISOString() }));
  const guildConfig = await effectiveGuildConfig(interaction.guildId).catch(() => config);
  if (database.configured) {
    try { await database.logRoleAction(entry); } catch (error) { console.error('Could not persist role audit:', error); }
  }
  if (guildConfig.logChannelId) {
    try {
      const channel = await interaction.guild.channels.fetch(guildConfig.logChannelId);
      if (channel?.isTextBased()) await channel.send({ embeds: [embed] });
    } catch (error) { console.error('Could not send staff log embed:', error); }
  }
}

async function handleAuthenticate(interaction) {
  if (!correctGuild(interaction)) {
    await interaction.reply({ content: 'Use this command in the configured Delta Air Lines server.', ephemeral: true });
    return;
  }
  const username = interaction.options.getString('roblox-username', true);
  await showAuthenticationModal(interaction, username);
}

async function showAuthenticationModal(interaction, username = null) {
  const components = [];
  if (!username) {
    components.push({ type: 1, components: [{ type: 4, custom_id: 'roblox-username', label: 'Roblox username', style: 1, placeholder: 'Your exact Roblox username', min_length: 3, max_length: 20, required: true }] });
  }
  components.push(
    { type: 1, components: [{ type: 4, custom_id: 'rp-first-name', label: 'What would you like your RP name to be?', style: 1, placeholder: 'First name only, such as Jordan', min_length: 2, max_length: 20, required: true }] },
    { type: 1, components: [{ type: 4, custom_id: 'rp-last-initial', label: 'Last initial — period required', style: 1, placeholder: 'Include the period, such as S.', min_length: 2, max_length: 2, required: true }] },
    { type: 1, components: [{ type: 4, custom_id: 'rp-confirmation', label: 'Confirm this is NOT your real name', style: 1, placeholder: 'Type CONFIRMED', min_length: 9, max_length: 9, required: true }] },
  );
  await interaction.showModal({
    custom_id: username ? `authenticate-rp:${username}` : 'authentication-panel:details',
    title: 'RP Name — Initial Must End in a Period',
    components,
  });
}

async function handleAuthenticateModal(interaction) {
  await interaction.deferReply({ ephemeral: true });
  try {
    const username = interaction.customId === 'authentication-panel:details'
      ? interaction.fields.getTextInputValue('roblox-username').trim()
      : interaction.customId.slice('authenticate-rp:'.length);
    const rpName = validateRpName(
      interaction.fields.getTextInputValue('rp-first-name'),
      interaction.fields.getTextInputValue('rp-last-initial'),
      interaction.fields.getTextInputValue('rp-confirmation'),
    );
    const result = await authentication.begin(interaction.user.id, interaction.guildId, username, rpName);
    await interaction.editReply(result.payload);
  } catch (error) {
    console.error('Could not begin authentication:', error);
    await interaction.editReply({ embeds: [{ color: 0xC8102E, title: '❌ Authentication Unavailable', description: String(error.message || error).slice(0, 500) }] });
  }
}

async function handleUpdate(interaction) {
  if (!correctGuild(interaction)) {
    await interaction.reply({ content: 'Use this command in the configured Delta Air Lines server.', ephemeral: true });
    return;
  }

  await interaction.deferReply({ ephemeral: true });
  try {
    await interaction.guild.roles.fetch();
    const [caller, target, botMember] = await Promise.all([
      interaction.guild.members.fetch(interaction.user.id),
      interaction.guild.members.fetch(interaction.options.getUser('user', true).id),
      interaction.guild.members.fetchMe(),
    ]);
    const requestedRole = interaction.options.getRole('role', true);
    const validation = validateRoleUpdate({
      guild: interaction.guild,
      caller,
      target,
      requestedRole,
      botMember,
      executiveRoleId: config.executiveRoleId,
      allowedRoleIds: config.updateAllowedRoleIds,
    });
    if (!validation.ok) {
      await interaction.editReply({ embeds: [validation.embed] });
      return;
    }

    await target.roles.add(requestedRole, `Role update requested by ${interaction.user.tag}`);
    const embed = successEmbed(target, requestedRole, caller);
    await recordAudit(interaction, {
      targetId: target.id, targetUsername: target.user.tag,
      executorId: caller.id, executorUsername: caller.user.tag,
      roleId: requestedRole.id, roleName: requestedRole.name, action: 'ROLE_ADD',
    }, embed);
    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    console.error('Discord role update failed:', error);
    await interaction.editReply({ embeds: [{
      color: 0xC8102E,
      title: '❌ Unable to Assign Role',
      description: `Discord could not assign the requested role: ${String(error.message || error).slice(0, 500)}`,
    }] });
  }
}

async function handleGetRole(interaction) {
  if (!correctGuild(interaction)) {
    await interaction.reply({ content: 'Use this command in the configured Delta Air Lines server.', ephemeral: true });
    return;
  }
  await interaction.deferReply({ ephemeral: true });
  try {
    const record = await database.getByDiscordId(interaction.user.id);
    if (!record) {
      await interaction.editReply({ embeds: [{ color: 0xC8102E, title: '❌ Authentication Required', description: 'Run `/authenticate` before using `/getrole`.' }] });
      return;
    }
    const [member, currentUser] = await Promise.all([
      interaction.guild.members.fetch(interaction.user.id),
      roblox.getUsernameFromUserId(record.roblox_user_id),
    ]);
    const guildConfig = await effectiveGuildConfig(interaction.guildId);
    await database.saveAuthentication({ discordUserId: member.id, robloxUserId: record.roblox_user_id, robloxUsername: currentUser.name });
    if (record.rp_name && member.manageable) {
      await member.setNickname(formatAuthenticatedNickname(record.rp_name, currentUser.name), 'Refresh authenticated Roblox username');
    }
    const authenticatedRole = guildConfig.authenticatedRoleId ? await interaction.guild.roles.fetch(guildConfig.authenticatedRoleId) : null;
    if (authenticatedRole && !member.roles.cache.has(authenticatedRole.id)) await member.roles.add(authenticatedRole, 'Restore authenticated role');
    const result = await roleSync.sync(member, record.roblox_user_id, guildConfig);
    await interaction.editReply({ embeds: [{
      color: 0x236192,
      title: '🎭 Role Synchronization Complete',
      fields: [
        { name: 'Roblox', value: currentUser.name, inline: true },
        { name: 'Roblox Rank', value: result.membership?.role?.name ?? 'Not in the Delta group', inline: true },
        { name: 'Added', value: result.added.length ? result.added.join(', ') : 'None' },
        { name: 'Removed', value: result.removed.length ? result.removed.join(', ') : 'None' },
      ],
    }] });
  } catch (error) {
    console.error('Roblox role synchronization failed:', error);
    await interaction.editReply({ embeds: [{ color: 0xC8102E, title: '❌ Role Synchronization Failed', description: String(error.message || error).slice(0, 500) }] });
  }
}

async function handleUnlink(interaction) {
  if (!correctGuild(interaction)) {
    await interaction.reply({ content: 'Use this command in the configured Delta Air Lines server.', ephemeral: true });
    return;
  }
  await interaction.deferReply({ ephemeral: true });
  try {
    await interaction.guild.roles.fetch();
    const [caller, target] = await Promise.all([
      interaction.guild.members.fetch(interaction.user.id),
      interaction.guild.members.fetch(interaction.options.getUser('user', true).id),
    ]);
    const access = validateExecutiveAccess(interaction.guild, caller, config.executiveRoleId, 'unlink');
    if (!access.ok) { await interaction.editReply({ embeds: [access.embed] }); return; }
    const record = await database.getByDiscordId(target.id);
    if (!record) {
      await interaction.editReply({ embeds: [{ color: 0x236192, title: 'ℹ️ No Authentication Found', description: `${target} is not linked to a Roblox account.` }] });
      return;
    }
    const guildConfig = await effectiveGuildConfig(interaction.guildId);
    const removed = await roleSync.removeManaged(target, guildConfig);
    if (guildConfig.unauthenticatedRoleId && !target.roles.cache.has(guildConfig.unauthenticatedRoleId)) {
      const unauthenticatedRole = await interaction.guild.roles.fetch(guildConfig.unauthenticatedRoleId);
      if (!unauthenticatedRole?.editable) throw new Error('The configured Unauthenticated role is not manageable by the bot');
      await target.roles.add(unauthenticatedRole, 'Roblox authentication unlinked');
    }
    await database.unlink(target.id);
    const embed = { color: 0x2E8540, title: '✅ Authentication Unlinked', fields: [
      { name: 'Member', value: `${target}`, inline: true },
      { name: 'Roblox ID', value: String(record.roblox_user_id), inline: true },
      { name: 'Removed Roles', value: removed.length ? removed.join(', ') : 'None' },
      { name: 'Unlinked By', value: `${caller}`, inline: true },
    ] };
    await recordAudit(interaction, {
      targetId: target.id, targetUsername: target.user.tag,
      executorId: caller.id, executorUsername: caller.user.tag,
      roleId: null, roleName: null, action: 'AUTHENTICATION_UNLINK',
    }, embed);
    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    console.error('Authentication unlink failed:', error);
    await interaction.editReply({ embeds: [{ color: 0xC8102E, title: '❌ Unable to Unlink', description: String(error.message || error).slice(0, 500) }] });
  }
}

async function handleAuthenticationConfig(interaction) {
  if (!interaction.inGuild() || !interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
    await interaction.reply({ content: 'You need **Manage Server** to configure authentication.', ephemeral: true });
    return;
  }
  await interaction.deferReply({ ephemeral: true });
  try {
    const subcommand = interaction.options.getSubcommand();
    let databaseConnected = false;
    if (database.configured) {
      try { databaseConnected = await database.ping(); } catch (error) { console.error('Authentication database check failed:', error); }
    }
    if (subcommand === 'status') {
      const oauthReady = Boolean(config.robloxOauthClientId
        && config.robloxOauthClientSecret && config.robloxOauthRedirectUri);
      const missingOAuth = authentication.configurationIssues().filter((name) => name !== 'DATABASE_URL');
      await interaction.editReply({ embeds: [{
        color: databaseConnected && oauthReady ? 0x2E8540 : 0xC8102E,
        title: '🔎 Authentication System Status',
        fields: [
          { name: 'PostgreSQL', value: databaseConnected ? '✅ Connected' : '❌ Not connected', inline: true },
          { name: 'Roblox OAuth', value: oauthReady ? '✅ Configured' : '❌ Missing environment variables', inline: true },
        ],
        description: !databaseConnected
          ? 'On Render, create or link a PostgreSQL database, set `DATABASE_URL` to its **Internal Database URL**, and redeploy. Database credentials cannot be entered through Discord.'
          : missingOAuth.length
            ? `Add these Render environment variables, then redeploy: ${missingOAuth.map((name) => `\`${name}\``).join(', ')}.`
            : 'The database and Roblox OAuth environment are ready. Use `/authentication-config set` for this server’s roles and Roblox group.',
      }] });
      return;
    }
    if (!databaseConnected) {
      await interaction.editReply({ embeds: [{
        color: 0xC8102E,
        title: '❌ PostgreSQL Not Connected',
        description: 'Authentication records and settings require persistent storage. On Render, create or link a PostgreSQL database, set `DATABASE_URL` to its **Internal Database URL**, then redeploy. For security, database credentials cannot be configured through a Discord command. Run `/authentication-config status` afterward.',
      }] });
      return;
    }
    if (subcommand === 'set') {
      const authenticatedRole = interaction.options.getRole('authenticated-role', true);
      const unauthenticatedRole = interaction.options.getRole('unauthenticated-role', true);
      const logChannel = interaction.options.getChannel('log-channel');
      const groupId = interaction.options.getString('roblox-group-id', true).trim();
      if (!/^\d+$/.test(groupId)) throw new Error('Roblox group ID must contain numbers only.');
      if (authenticatedRole.managed || unauthenticatedRole.managed) throw new Error('Integration-managed roles cannot be authentication roles.');
      if (!authenticatedRole.editable || !unauthenticatedRole.editable) throw new Error('Move the bot role above Authenticated and Unauthenticated first.');
      if (logChannel && !logChannel.isTextBased()) throw new Error('The log channel must be a text channel.');
      await database.saveGuildConfig({
        guildId: interaction.guildId,
        authenticatedRoleId: authenticatedRole.id,
        unauthenticatedRoleId: unauthenticatedRole.id,
        logChannelId: logChannel?.id ?? null,
        robloxGroupId: groupId,
        updatedBy: interaction.user.id,
      });
    } else if (subcommand === 'mapping-add') {
      if (!await database.getGuildConfig(interaction.guildId)) throw new Error('Run `/authentication-config set` first.');
      const robloxRoleId = interaction.options.getString('roblox-role-id', true).trim();
      const discordRole = interaction.options.getRole('discord-role', true);
      if (!/^\d+$/.test(robloxRoleId)) throw new Error('Roblox role ID must contain numbers only.');
      if (discordRole.id === interaction.guild.roles.everyone.id || discordRole.managed || !discordRole.editable) {
        throw new Error('That Discord role cannot be managed by authentication.');
      }
      await database.addRoleMapping(interaction.guildId, robloxRoleId, discordRole.id);
    } else if (subcommand === 'mapping-remove') {
      const robloxRoleId = interaction.options.getString('roblox-role-id', true).trim();
      if (!/^\d+$/.test(robloxRoleId)) throw new Error('Roblox role ID must contain numbers only.');
      await database.removeRoleMapping(interaction.guildId, robloxRoleId, interaction.options.getRole('discord-role')?.id ?? null);
    }

    const stored = await database.getGuildConfig(interaction.guildId);
    if (!stored) {
      await interaction.editReply({ embeds: [{ color: 0x236192, title: 'ℹ️ Authentication Not Configured', description: 'Run `/authentication-config set` to configure this server.' }] });
      return;
    }
    const mappings = Object.entries(stored.roleMappings).flatMap(([robloxRoleId, discordRoleIds]) =>
      discordRoleIds.map((discordRoleId) => `Roblox \`${robloxRoleId}\` → <@&${discordRoleId}>`));
    await interaction.editReply({ embeds: [{
      color: 0x071D49,
      title: subcommand === 'view' ? '⚙️ Authentication Configuration' : '✅ Authentication Configuration Updated',
      fields: [
        { name: 'Authenticated Role', value: `<@&${stored.authenticatedRoleId}>`, inline: true },
        { name: 'Unauthenticated Role', value: `<@&${stored.unauthenticatedRoleId}>`, inline: true },
        { name: 'Roblox Group ID', value: stored.robloxGroupId, inline: true },
        { name: 'Log Channel', value: stored.logChannelId ? `<#${stored.logChannelId}>` : 'Not configured', inline: true },
        { name: 'Role Mappings', value: mappings.join('\n').slice(0, 1024) || 'None configured' },
      ],
    }] });
  } catch (error) {
    console.error('Authentication configuration failed:', error);
    await interaction.editReply({ embeds: [{ color: 0xC8102E, title: '❌ Configuration Failed', description: String(error.message || error).slice(0, 500) }] });
  }
}

client.on(Events.InteractionCreate, async (interaction) => {
  if (interaction.isButton() && interaction.customId === 'authentication-panel:start') {
    if (!correctGuild(interaction)) {
      await interaction.reply({ content: 'Use authentication in the configured Delta Air Lines server.', ephemeral: true });
      return;
    }
    await showAuthenticationModal(interaction);
    return;
  }
  if (interaction.isModalSubmit() && (interaction.customId.startsWith('authenticate-rp:')
    || interaction.customId === 'authentication-panel:details')) {
    await handleAuthenticateModal(interaction);
    return;
  }
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === 'bot-version') {
    await interaction.reply({
      content: `Delta Virtual Assistant **v${botVersion}** — Delta Airlines layout enabled.`,
      ephemeral: true,
    });
    return;
  }

  if (interaction.commandName === 'skymiles') {
    await handleSkyMiles(interaction);
    return;
  }
  if (interaction.commandName === 'info') {
    await handleInfo(interaction);
    return;
  }
  if (interaction.commandName === 'authenticate') {
    await handleAuthenticate(interaction);
    return;
  }
  if (interaction.commandName === 'update') {
    await handleUpdate(interaction);
    return;
  }
  if (interaction.commandName === 'getrole') {
    await handleGetRole(interaction);
    return;
  }
  if (interaction.commandName === 'unlink') {
    await handleUnlink(interaction);
    return;
  }
  if (interaction.commandName === 'authentication-config') {
    await handleAuthenticationConfig(interaction);
    return;
  }
  if (interaction.commandName === 'authentication-panel') {
    if (!interaction.inGuild() || !interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
      await interaction.reply({ content: 'You need **Manage Server** to post the authentication panel.', ephemeral: true });
      return;
    }
    if (!interaction.channel?.isTextBased()) {
      await interaction.reply({ content: 'Run this command in a text channel.', ephemeral: true });
      return;
    }
    const messages = authenticationPanelPayloads(interaction.guild);
    for (const payload of messages) await interaction.channel.send(payload);
    await interaction.reply({ content: `Authentication panel posted as ${messages.length} messages.`, ephemeral: true });
    return;
  }
  if (interaction.commandName !== 'setup') return;

  if (!interaction.inGuild()) {
    await interaction.reply({ content: 'Run this command inside a server.', ephemeral: true });
    return;
  }

  const mode = interaction.options.getString('mode', true);
  const section = interaction.options.getString('section', true);
  if (mode === 'preview') {
    const sections = [];
    if (section !== 'channels') sections.push(`__ROLES__\n${formatRoles()}`);
    if (section !== 'roles') sections.push(`__CHANNELS__\n${formatLayout()}`);
    const preview = splitMessage(
      `Nothing has been changed. Here is the proposed setup:\n\n${sections.join('\n\n')}`,
    );
    await interaction.reply({ content: preview.shift(), ephemeral: true });
    for (const content of preview) await interaction.followUp({ content, ephemeral: true });
    return;
  }

  await interaction.deferReply({ ephemeral: true });
  try {
    const results = [];
    const warnings = [];
    if (section !== 'channels') {
      const roles = await runSetupStep('creating or checking roles', () => applyRoles(interaction.guild));
      results.push(`Roles: created ${roles.created}, skipped ${roles.skipped}.`);
      warnings.push(...roles.warnings);
    }
    if (section !== 'roles') {
      const channels = await applyChannels(interaction.guild);
      results.push(
        `Channels: created ${channels.categoriesCreated} categories and ${channels.channelsCreated} channels; `
        + `skipped ${channels.channelsSkipped} existing channels.`,
      );
      warnings.push(...channels.warnings);
    }
    await interaction.editReply(`Setup complete. ${results.join(' ')}`
      + (warnings.length ? `\n\n⚠️ ${warnings.join('\n⚠️ ')}` : ''));
  } catch (error) {
    console.error('Server setup failed:', error);
    await interaction.editReply(
      `Setup failed during **${error.setupStep || 'an unknown step'}**`
      + `${error.code ? ` (Discord code ${error.code})` : ''}: `
      + `\`${String(error.message || error).slice(0, 500)}\`. `
      + 'If this is a role hierarchy error, move the bot role above the roles it must manage.',
    );
  }
});

client.login(token).catch((error) => {
  health.markError(error);
  console.error('Discord login failed. Check DISCORD_TOKEN:', error);
  setTimeout(() => process.exit(1), 1000);
});

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
const { ROLE_GROUPS, formatRoles, roleDefinitions } = require('./roles');
const { atcRolePolicies } = require('./permissions');
const {
  awardMiles,
  getBalance,
  getLeaderboard,
  isSheetsConfigured,
} = require('./sheets');
const { startHealthServer } = require('./health');
const { INFO_MESSAGES, infoMessagePayload, missingBannerEnvironmentKeys } = require('./info');
const { createRobloxRoleSync } = require('./roblox-roles');
const { version: botVersion } = require('../package.json');

const token = process.env.DISCORD_TOKEN;

if (!token) {
  console.error('DISCORD_TOKEN is required. Add it to your environment before starting the bot.');
  process.exit(1);
}

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
const robloxRoles = createRobloxRoleSync();
const health = startHealthServer();

const setupCommand = new SlashCommandBuilder()
  .setName('setup')
  .setDescription('Preview or apply Delta PTFS roles, channels, or both')
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
  .setDescription('Leadership tools for Delta Roblox Community roles')
  .addSubcommand((subcommand) => subcommand
    .setName('user-role')
    .setDescription('Update a lower-ranking member from the Roblox Community')
    .addUserOption((option) => option.setName('user').setDescription('Discord member to update').setRequired(true))
    .addStringOption((option) => option.setName('roblox-username').setDescription('Member’s exact Roblox username').setRequired(true)));

const getRoleCommand = new SlashCommandBuilder()
  .setName('getrole')
  .setDescription('Update your role using the Roblox username approved by Leadership');

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
  if (!categoryDefinition.accessRoles) return [];

  return [
    { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
    ...categoryDefinition.accessRoles.flatMap((name) => {
      const role = rolesByName.get(name.toLowerCase())
        ?? rolesByName.get(`${name} | delta ptfs`.toLowerCase());
      return role ? [{
      id: role.id,
      allow: [PermissionFlagsBits.ViewChannel],
      }] : [];
    }),
  ];
}

const ATC_MEDIA_DENIES = [
  PermissionFlagsBits.Stream,
  PermissionFlagsBits.UseSoundboard,
  PermissionFlagsBits.UseExternalSounds,
  PermissionFlagsBits.UseEmbeddedActivities,
];

function configuredRole(rolesByName, name) {
  return rolesByName.get(`${name} | delta ptfs`.toLowerCase())
    ?? rolesByName.get(name.toLowerCase());
}

function channelOverwrites(guild, channelDefinition, rolesByName) {
  if (!channelDefinition.flightDeckOnly) return undefined;

  const listenerDenies = [
    PermissionFlagsBits.Speak,
    PermissionFlagsBits.PrioritySpeaker,
    PermissionFlagsBits.SendMessages,
    PermissionFlagsBits.SendMessagesInThreads,
    PermissionFlagsBits.CreatePublicThreads,
    PermissionFlagsBits.CreatePrivateThreads,
    PermissionFlagsBits.AddReactions,
    PermissionFlagsBits.UseApplicationCommands,
    ...ATC_MEDIA_DENIES,
  ];
  const overwrites = [{
    id: guild.roles.everyone.id,
    allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect],
    deny: listenerDenies,
  }];

  for (const policy of atcRolePolicies()) {
    const role = configuredRole(rolesByName, policy.name);
    if (!role) continue;
    overwrites.push({
      id: role.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.Connect,
        ...(policy.canSpeak ? [PermissionFlagsBits.Speak, PermissionFlagsBits.UseVAD] : []),
        ...(policy.prioritySpeaker ? [PermissionFlagsBits.PrioritySpeaker] : []),
      ],
      deny: [
        ...ATC_MEDIA_DENIES,
        ...(!policy.canSpeak ? [PermissionFlagsBits.Speak, PermissionFlagsBits.PrioritySpeaker] : []),
      ],
    });
  }
  return overwrites;
}

async function findOrCreateCategory(guild, categoryDefinition, rolesByName) {
  const existing = guild.channels.cache.find(
    (channel) => channel.type === ChannelType.GuildCategory
      && channel.name.toLowerCase() === categoryDefinition.name.toLowerCase(),
  );
  const permissionOverwrites = categoryOverwrites(guild, categoryDefinition, rolesByName);
  if (existing) {
    if (categoryDefinition.accessRoles) {
      await existing.permissionOverwrites.set(
        permissionOverwrites,
        'Synchronize Delta Air Lines PTFS category access',
      );
    }
    return { category: existing, created: false };
  }

  const category = await guild.channels.create({
    name: categoryDefinition.name,
    type: ChannelType.GuildCategory,
    permissionOverwrites,
    reason: 'Delta Air Lines PTFS server setup',
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

  // v2.1 replaces the former OAuth verification system with Roblox Community
  // rank synchronization, so its obsolete role should not remain in servers.
  const legacyVerifiedRole = guild.roles.cache.find((role) =>
    ['verified', 'verified | delta ptfs'].includes(role.name.toLowerCase()));
  if (legacyVerifiedRole?.editable) {
    await legacyVerifiedRole.delete('Remove retired Roblox verification role');
  }

  // New roles start near the bottom and push earlier roles upward, so creating
  // the hierarchy from highest to lowest preserves its intended order.
  for (const definition of definitions) {
    let existing = guild.roles.cache.find(
      (role) => role.name.toLowerCase() === definition.name.toLowerCase(),
    );
    const legacyRole = definition.baseName && guild.roles.cache.find(
      (role) => role.name.toLowerCase() === definition.baseName.toLowerCase(),
    );
    if (!existing && legacyRole?.editable) {
      existing = await legacyRole.edit({
        name: definition.name,
        reason: 'Apply Delta PTFS role naming format',
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
        reason: 'Delta Air Lines PTFS server setup',
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
      'Order Delta Air Lines PTFS roles and category separators',
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
    ...atcRolePolicies().map(({ name }) => name),
  ]);
  const missingRoles = [...requiredRoleNames].filter((name) =>
    !rolesByName.has(name.toLowerCase())
    && !rolesByName.has(`${name} | delta ptfs`.toLowerCase()));
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
      const existing = guild.channels.cache.find(
        (channel) => channel.parentId === category.id
          && channel.type === type
          && normalizedName(channel.name) === expectedName,
      );
      if (existing) {
        const permissionOverwrites = channelOverwrites(guild, channelDefinition, rolesByName);
        if (permissionOverwrites) {
          await runSetupStep(
            `updating permissions for ${existing.name}`,
            () => existing.permissionOverwrites.set(
              permissionOverwrites,
              'Synchronize listen-only ATC frequency permissions',
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
          reason: 'Delta Air Lines PTFS server setup',
        }));
      channelsCreated += 1;
    }
  }

  // Migrate servers from the earlier two-category frequency layout after all
  // replacement airport categories have been created successfully.
  const legacyFrequencyCategories = guild.channels.cache.filter((channel) =>
    channel.type === ChannelType.GuildCategory
    && ['atc frequencies 1', 'atc frequencies 2'].includes(channel.name.toLowerCase()));
  for (const legacyCategory of legacyFrequencyCategories.values()) {
    const legacyChildren = guild.channels.cache.filter(
      (channel) => channel.parentId === legacyCategory.id,
    );
    for (const legacyChannel of legacyChildren.values()) {
      await legacyChannel.delete('Migrate to individual airport frequency categories');
    }
    await legacyCategory.delete('Migrate to individual airport frequency categories');
  }

  for (const categoryDefinition of SERVER_LAYOUT.filter(({ bottom }) => bottom)) {
    const category = guild.channels.cache.find((channel) =>
      channel.type === ChannelType.GuildCategory
      && channel.name.toLowerCase() === categoryDefinition.name.toLowerCase());
    try {
      await category.setPosition(guild.channels.cache.size - 1, {
        reason: 'Keep ATC frequency categories at the bottom',
      });
    } catch (error) {
      if (error.code !== 50013) throw error;
      warnings.push(`Could not move ${category.name} to the bottom (50013).`);
    }
  }

  return {
    categoriesCreated,
    channelsCreated,
    channelsSkipped,
    warnings,
  };
}

client.once(Events.ClientReady, async (readyClient) => {
  health.markReady();
  try {
    await readyClient.application.commands.set([
      setupCommand.toJSON(), skyMilesCommand.toJSON(), versionCommand.toJSON(), infoCommand.toJSON(),
      updateCommand.toJSON(), getRoleCommand.toJSON(),
    ]);
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

function memberDivision(member) {
  for (const group of ROLE_GROUPS) {
    if (group.roles.some((definition) => member.roles.cache.some((role) =>
      role.name.toLowerCase() === `${definition.name} | delta ptfs`.toLowerCase()
      || role.name.toLowerCase() === definition.name.toLowerCase()))) return group.name;
  }
  return null;
}

async function handleRobloxRoleCommand(interaction) {
  if (!interaction.inGuild()) {
    await interaction.reply({ content: 'Run this command inside the Delta server.', ephemeral: true });
    return;
  }
  if (!robloxRoles.configured()) {
    await interaction.reply({
      content: 'Roblox role sync is not configured yet. Add `ROBLOX_COMMUNITY_ID` to the bot host.',
      ephemeral: true,
    });
    return;
  }

  await interaction.deferReply({ ephemeral: true });
  try {
    const actor = await interaction.guild.members.fetch(interaction.user.id);
    let target = actor;
    if (interaction.commandName === 'update') {
      const actorDivision = memberDivision(actor);
      if (!['Board of Directors', 'Leadership'].includes(actorDivision)) {
        await interaction.editReply('Only Board of Directors and Leadership members can use `/update user-role`.');
        return;
      }

      target = await interaction.guild.members.fetch(interaction.options.getUser('user', true).id);
      if (target.id === actor.id) {
        await interaction.editReply('Use `/getrole` to update your own role.');
        return;
      }
      if (target.roles.highest.position >= actor.roles.highest.position) {
        await interaction.editReply('You cannot update someone at or above your highest Discord role.');
        return;
      }
      const targetDivision = memberDivision(target);
      if (targetDivision && targetDivision === actorDivision) {
        await interaction.editReply(`You cannot update another member within your own **${actorDivision}** division.`);
        return;
      }
    }

    const result = await robloxRoles.syncMember(
      target,
      interaction.commandName === 'update'
        ? interaction.options.getString('roblox-username', true)
        : target.displayName,
    );
    await interaction.editReply(
      `Updated **${target.displayName}** to **${result.role.name}** from Roblox rank **${result.robloxRole.name}**.`,
    );
  } catch (error) {
    console.error('Roblox role synchronization failed:', error);
    await interaction.editReply(`Role update failed: ${String(error.message || error).slice(0, 500)}.`);
  }
}

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === 'bot-version') {
    await interaction.reply({
      content: `Delta Virtual Assistant **v${botVersion}** — full ATC frequency layout enabled.`,
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
  if (interaction.commandName === 'getrole' || interaction.commandName === 'update') {
    await handleRobloxRoleCommand(interaction);
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

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

const token = process.env.DISCORD_TOKEN;

if (!token) {
  console.error('DISCORD_TOKEN is required. Add it to your environment before starting the bot.');
  process.exit(1);
}

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
const health = startHealthServer();

const setupCommand = new SlashCommandBuilder()
  .setName('setup-server')
  .setDescription('Preview or create the Delta Air Lines PTFS roles and channels')
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

function normalizedName(name) {
  return name.toLowerCase().replaceAll(' ', '-');
}

function categoryOverwrites(guild, categoryDefinition, rolesByName) {
  if (!categoryDefinition.accessRoles) return [];

  return [
    { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
    ...categoryDefinition.accessRoles.map((name) => ({
      id: rolesByName.get(name.toLowerCase()).id,
      allow: [PermissionFlagsBits.ViewChannel],
    })),
  ];
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
  const definitions = roleDefinitions();
  let created = 0;
  let skipped = 0;

  // New roles start near the bottom and push earlier roles upward, so creating
  // the hierarchy from highest to lowest preserves its intended order.
  for (const definition of definitions) {
    const existing = guild.roles.cache.find(
      (role) => role.name.toLowerCase() === definition.name.toLowerCase(),
    );
    if (existing) {
      skipped += 1;
      continue;
    }

    await guild.roles.create({
      name: definition.name,
      color: definition.color,
      hoist: definition.hoist ?? false,
      permissions: (definition.permissions ?? []).map((name) => PermissionFlagsBits[name]),
      reason: 'Delta Air Lines PTFS server setup',
    });
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
  await guild.roles.setPositions(
    configuredRoles.map((role, index) => ({
      role: role.id,
      position: definitions.length - index,
    })),
    'Order Delta Air Lines PTFS roles and category separators',
  );

  const appDefinition = definitions.find((definition) => definition.app);
  const appRole = guild.roles.cache.find(
    (role) => role.name.toLowerCase() === appDefinition.name.toLowerCase(),
  );
  const botMember = guild.members.me ?? await guild.members.fetchMe();
  if (!botMember.roles.cache.has(appRole.id)) await botMember.roles.add(appRole);

  return { created, skipped };
}

async function applyLayout(guild) {
  await guild.channels.fetch();
  const roleResult = await applyRoles(guild);
  const rolesByName = new Map(
    guild.roles.cache.map((role) => [role.name.toLowerCase(), role]),
  );

  let categoriesCreated = 0;
  let channelsCreated = 0;
  let channelsSkipped = 0;

  for (const categoryDefinition of SERVER_LAYOUT) {
    const result = await findOrCreateCategory(guild, categoryDefinition, rolesByName);
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
        channelsSkipped += 1;
        continue;
      }

      await guild.channels.create({
        name: channelDefinition.name,
        type,
        parent: category.id,
        topic: type === ChannelType.GuildText ? channelDefinition.topic : undefined,
        reason: 'Delta Air Lines PTFS server setup',
      });
      channelsCreated += 1;
    }
  }

  return {
    categoriesCreated,
    channelsCreated,
    channelsSkipped,
    rolesCreated: roleResult.created,
    rolesSkipped: roleResult.skipped,
  };
}

client.once(Events.ClientReady, async (readyClient) => {
  health.markReady();
  try {
    await readyClient.application.commands.set([setupCommand.toJSON(), skyMilesCommand.toJSON()]);
    console.log(`Ready as ${readyClient.user.tag}. Server setup and SkyMiles commands are registered.`);
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

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === 'skymiles') {
    await handleSkyMiles(interaction);
    return;
  }
  if (interaction.commandName !== 'setup-server') return;

  if (!interaction.inGuild()) {
    await interaction.reply({ content: 'Run this command inside a server.', ephemeral: true });
    return;
  }

  const mode = interaction.options.getString('mode', true);
  if (mode === 'preview') {
    await interaction.reply({
      content: `Nothing has been changed. Here is the proposed setup:\n\n__ROLES__\n${formatRoles()}\n\n__CHANNELS__\n${formatLayout()}`,
      ephemeral: true,
    });
    return;
  }

  await interaction.deferReply({ ephemeral: true });
  try {
    const result = await applyLayout(interaction.guild);
    await interaction.editReply(
      `Setup complete: created ${result.categoriesCreated} categories, `
      + `${result.channelsCreated} channels, and ${result.rolesCreated} roles. `
      + `Skipped ${result.channelsSkipped} existing channels and ${result.rolesSkipped} existing roles.`,
    );
  } catch (error) {
    console.error('Channel setup failed:', error);
    await interaction.editReply(
      'Setup failed. Make sure the bot has **Manage Channels** and **Manage Roles**, then try again.',
    );
  }
});

client.login(token).catch((error) => {
  health.markError(error);
  console.error('Discord login failed. Check DISCORD_TOKEN:', error);
  setTimeout(() => process.exit(1), 1000);
});

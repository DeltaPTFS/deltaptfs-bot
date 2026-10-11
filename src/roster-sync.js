'use strict';
const { PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');
const { sheetsRequest, isSheetsConfigured } = require('./sheets');

const rosterCommand = new SlashCommandBuilder()
  .setName('sync-roster')
  .setDescription('Sync Delta Air Lines / Crew Discord members and roles to Google Sheets')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);

function memberRow(member) {
  const roles = member.roles.cache.filter(role => role.id !== member.guild.id);
  return {
    userId: member.id, displayName: member.displayName, discordUsername: member.user.username,
    guildId: member.guild.id, guildName: member.guild.name,
    roleIds: Array.from(roles.values(), role => role.id), roleNames: Array.from(roles.values(), role => role.name)
  };
}

async function syncGuild(guild) {
  const members = await guild.members.fetch();
  const records = Array.from(members.values()).filter(member => !member.user.bot).map(memberRow);
  for (let i = 0; i < records.length; i += 80) {
    await sheetsRequest('upsertDiscordRoster', { members: records.slice(i, i + 80) });
  }
  return records.length;
}

async function syncAllGuilds(client, guildIds) {
  if (!isSheetsConfigured()) return [];
  const results = [];
  for (const guildId of guildIds) {
    if (!guildId) continue;
    try {
      const guild = await client.guilds.fetch(guildId);
      const total = await syncGuild(guild);
      results.push({ guild: guild.name, total });
    } catch (error) {
      console.error('Roster sync failed for ' + guildId, error);
      results.push({ guild: guildId, error: error.message });
    }
  }
  return results;
}

async function handleRosterSync(interaction, client, guildIds) {
  if (!interaction.inGuild() || !interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
    return interaction.reply({ content: 'Manage Server is required.', ephemeral: true });
  }
  await interaction.deferReply({ ephemeral: true });
  const results = await syncAllGuilds(client, guildIds);
  await interaction.editReply(results.map(r => r.error ? r.guild + ': ' + r.error : r.guild + ': ' + r.total + ' members').join('\n')
    || 'Set up Google Sheets and Delta server IDs first.');
}

module.exports = { rosterCommand, memberRow, syncGuild, syncAllGuilds, handleRosterSync };

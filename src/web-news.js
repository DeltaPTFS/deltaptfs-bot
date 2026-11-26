'use strict';
const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { websiteRequest, websiteConfigured } = require('./website-client');

const webNewsCommand = new SlashCommandBuilder()
  .setName('web-news')
  .setDescription('Ownership: save or publish a Delta Roblox website news article')
  .addStringOption(o => o.setName('title').setDescription('Article title').setRequired(true).setMinLength(1).setMaxLength(180))
  .addStringOption(o => o.setName('body').setDescription('Article text').setRequired(true).setMinLength(1).setMaxLength(6000))
  .addBooleanOption(o => o.setName('publish').setDescription('Publish immediately? Defaults to saving an unpublished draft.'));

async function handleWebNews(interaction, guildId, request = websiteRequest, configured = websiteConfigured) {
  if (!interaction.inGuild() || interaction.guildId !== guildId) {
    return interaction.reply({content:'Run this command in the Delta main Discord.',flags:MessageFlags.Ephemeral});
  }
  if (!configured()) {
    return interaction.reply({content:'The website connection is not configured. Contact Ownership.',flags:MessageFlags.Ephemeral});
  }
  await interaction.deferReply({flags:MessageFlags.Ephemeral});
  try {
    // The website verifies the actor's live Ownership role and active account
    // using its own Discord credentials. No cached bot permission grants access.
    const result = await request('/internal/news/publish', {
      actor_id:interaction.user.id,
      title:interaction.options.getString('title', true),
      body:interaction.options.getString('body', true),
      published:interaction.options.getBoolean('publish') === true,
    });
    const base = process.env.DELTA_WEBSITE_URL.replace(/\/+$/, '');
    const link = result.published ? base + '/news#news-article-' + result.id : base + '/owner#news-article-editor';
    await interaction.editReply({content:(result.published?'Article published: ':'Draft saved: ')+link,allowedMentions:{parse:[]}});
  } catch (error) {
    await interaction.editReply({content:'News was not saved: '+String(error.message || error).slice(0,220),allowedMentions:{parse:[]}});
  }
}

module.exports = { webNewsCommand, handleWebNews };

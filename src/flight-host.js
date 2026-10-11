'use strict';
const { EmbedBuilder, SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { hostFlight } = require('./website-client');
const flightHostCommand = new SlashCommandBuilder()
  .setName('flight-host')
  .setDescription('Host a Delta Air Lines flight and publish its linked crew fillout')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageEvents)
  .addStringOption(o => o.setName('number').setDescription('Flight number, e.g. DAL 1234').setRequired(true).setMaxLength(14))
  .addStringOption(o => o.setName('departure').setDescription('ICAO/IATA departure airport').setRequired(true).setMaxLength(4))
  .addStringOption(o => o.setName('destination').setDescription('ICAO/IATA arrival airport').setRequired(true).setMaxLength(4))
  .addStringOption(o => o.setName('start-utc').setDescription('UTC departure: 2026-11-01T19:00Z').setRequired(true))
  .addStringOption(o => o.setName('aircraft').setDescription('Aircraft e.g. A321neo').setRequired(true).setMaxLength(100))
  .addStringOption(o => o.setName('gate').setDescription('Assigned gate').setMaxLength(30))
  .addStringOption(o => o.setName('remarks').setDescription('Flight announcement details').setMaxLength(800));

async function handleFlightHost(interaction) {
  const approved = [process.env.GUILD_ID, process.env.DELTA_CREW_GUILD_ID].filter(Boolean);
  if (!interaction.inGuild() || !approved.includes(interaction.guildId) || !interaction.memberPermissions?.has(PermissionFlagsBits.ManageEvents)) {
    return interaction.reply({ content: 'Manage Events permission is required to host a flight.', ephemeral: true });
  }
  const number = interaction.options.getString('number', true).trim().toUpperCase();
  const departure = interaction.options.getString('departure', true).trim().toUpperCase();
  const destination = interaction.options.getString('destination', true).trim().toUpperCase();
  const start = interaction.options.getString('start-utc', true).trim();
  if (!/^[A-Z]{2,4}\s?\d{1,4}$/.test(number) || !/^[A-Z0-9]{3,4}$/.test(departure)
      || !/^[A-Z0-9]{3,4}$/.test(destination) || departure === destination
      || !/^\d{4}-\d\d-\d\dT\d\d:\d\d(?:\:\d\d)?Z$/.test(start) || !Number.isFinite(Date.parse(start))) {
    return interaction.reply({ content: 'Use a valid flight number, two different airport codes and UTC time such as 2026-11-01T19:00Z.', ephemeral: true });
  }
  await interaction.deferReply({ ephemeral: true });
  try {
    const output = await hostFlight({
      event_id: interaction.id, host_discord_id: interaction.user.id, flight_number: number,
      departure, destination, starts_at: new Date(start).toISOString(),
      aircraft: interaction.options.getString('aircraft', true),
      gate: interaction.options.getString('gate') || '',
      description: interaction.options.getString('remarks') || '',
    });
    const embed = new EmbedBuilder()
      .setColor(0xC8102E)
      .setTitle('DELTA AIR LINES | ' + number)
      .setDescription('A new roleplay flight is now boarding for signups!\n\n' +
        (interaction.options.getString('remarks') || 'Join us for a new Delta flight experience.'))
      .addFields(
        { name: 'Route', value: departure + ' → ' + destination, inline: true },
        { name: 'Departure (UTC)', value: '<t:' + Math.floor(Date.parse(start) / 1000) + ':F>', inline: true },
        { name: 'Aircraft', value: interaction.options.getString('aircraft', true), inline: true },
        { name: 'Gate', value: interaction.options.getString('gate') || 'TBA', inline: true },
        { name: 'Crew Fillout', value: '[Complete your flight fillout](' + output.form_url + ')' },
        { name: 'SkyMiles Booking', value: '[Book a flight](' + output.booking_url + ')' },
      ).setFooter({ text: 'Keep Climbing, Delta Air Lines · Unofficial Roblox Roleplay' });
    await interaction.channel.send({ embeds: [embed], allowedMentions: { parse: [] } });
    await interaction.editReply('Flight ' + number + ' created on the website, queued for Sheets, and posted here.\nWebsite Flight ID: **' + output.flight_id + '** (use this number in /format).\nCrew fillout: ' + output.form_url);
  } catch (error) {
    console.error('Flight host failed:', error);
    await interaction.editReply('The flight could not be published: ' + String(error.message || error).slice(0, 300));
  }
}
module.exports = { flightHostCommand, handleFlightHost };

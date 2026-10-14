'use strict';
const {SlashCommandBuilder,PermissionFlagsBits,AttachmentBuilder,ActionRowBuilder,ButtonBuilder,ButtonStyle}=require('discord.js');
const WEBSITE='https://roblox-delta-web.vercel.app';
const MAIN_GUILD='1538738611988467782';
const SIGNUP_TEXT=[
  '## <:DeltaLogo:1540927958116601980> Delta Air Lines | SkyMiles Sign-Up <:SkyTeamLogo:1540927923618316359>',
  '',
  '-# <:Blank:1540951736062312529> <:DownwardShift:1539450554684801044> 1021 N Outer Loop Rd, East Point, GA, 30344.',
  '',
  '> <:BArrow:1540951845147639809> **Ready to join Delta SkyMiles?**',
  '',
  'Getting started only takes a few steps.',
  '',
  '<:Identification:1544505969575198821> **Verify Your Accounts**',
  'When you enter the SkyMiles website, you’ll be asked to verify both your **Discord** and **Roblox** accounts.',
  '',
  '<:ExternalLink:1540927590418612366> **Automatic Sign-In**',
  'Once both accounts are verified, you’ll be **automatically signed in** to your SkyMiles account.',
  '',
  '<:Checklist:1544506010406752296> **New to SkyMiles?**',
  'If this is your first time joining, you’ll be shown a quick **tutorial** covering your SkyMiles account, bookings, balance, and other features.',
  '',
  '> **[Join Delta SkyMiles]('+WEBSITE+')**',
  '',
  '<:WingPinLogo:1540927847709802607> **Keep Climbing, Delta Air Lines.**'
].join('\n');

const command=new SlashCommandBuilder().setName('skymiles')
  .setDescription('Post the SkyMiles signup guide with a website button and optional banners')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .addAttachmentOption(o=>o.setName('top-banner').setDescription('Optional image to send above the guide'))
  .addAttachmentOption(o=>o.setName('bottom-banner').setDescription('Optional image to send below the guide'));

function imageOk(attachment){
  if(!attachment)return true;
  if(!attachment.contentType?.startsWith('image/') || attachment.size>8*1024*1024)return false;
  try{
    const url=new URL(attachment.url);
    return url.protocol==='https:' && ['cdn.discordapp.com','media.discordapp.net'].includes(url.hostname);
  }catch{return false;}
}
async function bannerFile(attachment,prefix){
  const response=await fetch(attachment.url,{signal:AbortSignal.timeout(15000)});
  if(!response.ok)throw Error('Cannot download the banner from Discord.');
  const declared=Number(response.headers.get('content-length')||0);
  if(declared>8*1024*1024)throw Error('Banner is too large.');
  const bytes=Buffer.from(await response.arrayBuffer());
  if(bytes.length>8*1024*1024)throw Error('Banner is too large.');
  const ext=(attachment.name||'').match(/\.(png|jpe?g|webp|gif)$/i)?.[0]||'.png';
  return new AttachmentBuilder(bytes,{name:prefix+ext});
}

async function handle(interaction,{guildId=MAIN_GUILD}={}){
  if(!interaction.inGuild()||interaction.guildId!==guildId){
    await interaction.reply({content:'Use this command in the Delta Air Lines server.',ephemeral:true});return;
  }
  if(!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)){
    await interaction.reply({content:'Manage Server permission is needed to post the guide.',ephemeral:true});return;
  }
  const top=interaction.options.getAttachment('top-banner');
  const bottom=interaction.options.getAttachment('bottom-banner');
  if(!imageOk(top)||!imageOk(bottom)){
    await interaction.reply({content:'Banners must be HTTPS images no larger than 8 MB.',ephemeral:true});return;
  }
  await interaction.deferReply({ephemeral:true});
  const channel=interaction.channel;
  try{
    if(top)await channel.send({files:[await bannerFile(top,'skymiles-top')],allowedMentions:{parse:[]}});
    const button=new ButtonBuilder().setStyle(ButtonStyle.Link).setURL(WEBSITE).setLabel('Join Delta SkyMiles')
      .setEmoji({id:'1540927590418612366',name:'ExternalLink'});
    const row=new ActionRowBuilder().addComponents(button);
    await channel.send({content:SIGNUP_TEXT,components:[row],allowedMentions:{parse:[]}});
    if(bottom)await channel.send({files:[await bannerFile(bottom,'skymiles-bottom')],allowedMentions:{parse:[]}});
    await interaction.editReply('SkyMiles signup guide posted.');
  }catch(err){
    console.error('SkyMiles signup guide failed:',err);
    await interaction.editReply('Unable to post the guide. Please confirm my permissions to send messages, links, and attachments.');
  }
}
module.exports={command,handle,SIGNUP_TEXT,MAIN_GUILD,imageOk};

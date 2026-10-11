'use strict';
const crypto=require('node:crypto');
const {SlashCommandBuilder,PermissionFlagsBits,AttachmentBuilder}=require('discord.js');
const {getFlight,updateFlightStatus}=require('./website-client');

const FORMAT_OPTIONS=[
  ['Ready To Go','ready'],['View Itinerary','itinerary'],['Flight Delayed','delayed'],
  ['Flight Rescheduled','rescheduled'],['Flight Canceled','canceled'],
  ['Check In Open','checkin-open'],['Check In Closed','checkin-closed'],
  ['Flight Arrived','arrived']
];
const command=new SlashCommandBuilder().setName('format')
  .setDescription('Preview and publish official Delta Air Lines flight updates')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageEvents)
  .addStringOption(o=>o.setName('type').setDescription('Flight announcement format').setRequired(true)
    .addChoices(...FORMAT_OPTIONS.map(([name,value])=>({name,value}))))
  .addIntegerOption(o=>o.setName('flight-id').setDescription('Flight ID displayed in the website admin /flight-host reply')
    .setMinValue(1).setRequired(true))
  .addStringOption(o=>o.setName('operator').setDescription('Operating carrier')
    .addChoices(...['Delta Air Lines','Endeavor Air','SkyWest Airlines','Republic Airways'].map(value=>({name:value,value}))))
  .addStringOption(o=>o.setName('time-utc').setDescription('New/selected departure time in UTC, e.g. 2026-11-01T19:00Z'))
  .addStringOption(o=>o.setName('reason').setDescription('Delay/cancellation explanation or flight notes').setMaxLength(450))
  .addStringOption(o=>o.setName('event-link').setDescription('Discord scheduled event URL'))
  .addStringOption(o=>o.setName('game-link').setDescription('Roblox game link for check-in'))
  .addStringOption(o=>o.setName('flight-duration').setDescription('Estimated flight time, e.g. 2h 30m'))
  .addStringOption(o=>o.setName('seats').setDescription('Seat configuration, e.g. 16 First, 50 Comfort, 123 Main'))
  .addStringOption(o=>o.setName('amenities').setDescription('Onboard offerings or emoji list'))
  .addStringOption(o=>o.setName('service').setDescription('Hot meals, snacks, drinks, etc.'))
  .addIntegerOption(o=>o.setName('miles').setDescription('SkyMiles reward for this flight').setMinValue(0).setMaxValue(100000))
  .addStringOption(o=>o.setName('arrival').setDescription('On-Time or Delayed').addChoices(
    {name:'On-Time',value:'On-Time'},{name:'Delayed',value:'Delayed'}));

const icon={
  delta:'<:DeltaLogo:1540927958116601980>',skyteam:'<:SkyTeamLogo:1540927923618316359>',
  blank:'<:Blank:1540951736062312529>',connection:'<:Connection:1540927881683669013>',
  arrow:'<:BArrow:1540951845147639809>',right:'<:RArrow:1540951788889575504>',
  wing:'<:WingPinLogo:1540927847709802607>',route:'<:Maps:1540926938632298608>',
  time:'<:Timer:1540927345324728400>',board:'<:Ticket:1541639596826169344>',
  engine:'<:Engine:1556830866783871098>',plane:'<:Plane:1540926994332651580>',
  first:'<:FirstClass:1540927682831720458>',comfort:'<:DeltaComfort:1540927729967562782>',
  main:'<:DeltaMain:1536955001170174042>',phone:'<:Phone:1541639969049935913>'
};
const ongoing=new Map();
const HEADERS={
  ready:'Get Ready To Go',itinerary:'View Your Up-and-Coming Itinerary',delayed:'Flight Delayed',
  rescheduled:'Flight Rescheduled',canceled:'Flight Canceled',
  'checkin-open':'Check In Open','checkin-closed':'Check In Closed',arrived:'Arrived'
};
const SUPPORT='https://discord.com/channels/1538738611988467782/1539651325615153233';
const FOOTER='-# '+icon.wing+' **Keep Climbing, Delta Air Lines.**';

function allowedLink(url,kind){
  if(!url)return '';
  try{
    const u=new URL(url);
    if(u.protocol!=='https:'||u.username||u.password)return '';
    if(kind==='event'&&!['discord.com','www.discord.com'].includes(u.hostname))return '';
    if(kind==='game'&&u.hostname!=='roblox.com'&&!u.hostname.endsWith('.roblox.com'))return '';
    return u.href;
  }catch{return '';}
}
function safe(s,max=300){return String(s||'').replace(/@everyone|@here/g,'everyone').replace(/<@!?(\d+)>/g,'user').slice(0,max);}
function discordTime(value){
  const date=new Date(value);
  if(!value||!Number.isFinite(date.getTime()))throw new Error('A valid scheduled departure time is required.');
  return '<t:'+Math.floor(date.getTime()/1000)+':F>';
}
function details(op){
  const flight=op.flight,operator=safe(op.operator||'Delta Air Lines',70);
  const flightNumber=safe((flight.flight_number||'DL 0000').replace(/^(DAL|DL)\s*/,'DL - '),30);
  const tag='**'+flightNumber+'** operated by **'+operator+'**';
  const when=discordTime(op.time||flight.starts_at);
  const header='## '+icon.delta+' '+HEADERS[op.type]+' | '+icon.skyteam+'\n'+
    '-# '+icon.blank+' '+icon.connection+' 1021 N Outer Loop Rd, East Point, GA, 30344.\n\n';
  const start=icon.arrow,extra=icon.right;
  const event=op.eventLink?('[scheduled flight]('+op.eventLink+')'):'the scheduled flight';
  const game=op.gameLink?('[open]('+op.gameLink+')'):'open';
  const reason=op.reason?safe(op.reason,450):'operational adjustments';
  let lines=[];
  switch(op.type){
  case 'ready':
    lines=[ '> '+start+' '+tag+' is **scheduled** for **departure** on **'+when+'**.',
      '> '+extra+' **Reservations** for **'+flightNumber+'** are **officially open** from **now** until **the day of** '+event+'.'];
    break;
  case 'itinerary':{
    const route=safe(flight.departure+' - '+flight.destination,60);
    const amenities=safe(op.amenities||'<:PersonalScreen:1536956020537167922> <:InSeatPower:1536956525791412295> <:WiFi:1536956601099878491> <:USBPower:1536955633834926110>',500);
    const boarding=discordTime(op.boardingTime||new Date(new Date(op.time||flight.starts_at).getTime()-30*60*1000).toISOString());
    lines=[
      '> '+start+' **Please view all '+(op.eventLink?'[relevant information]('+op.eventLink+')':'relevant information')+
      '** for your **up-and-coming flight** onboard **'+operator+'** flight **'+flightNumber+'**.',
      '> '+extra+' **Flight Information**',
      '> '+icon.route+' **Route -** '+route,
      '> '+icon.time+' **Flight Time -** '+safe(op.duration||'To Be Confirmed'),
      '> '+icon.board+' **Boarding Time -** '+boarding,
      '> '+icon.engine+' **Scheduled Departure -** '+when,
      '> '+icon.plane+' **Aircraft Used -** '+safe(flight.aircraft||'To Be Announced',90),
      '> '+icon.first+' **Seat Configuration -** '+safe(op.seats||'To Be Confirmed',220),
      '> '+icon.phone+' **SkyMiles Earned -** '+(op.miles??flight.miles_reward??0),
      '> '+icon.delta+' **Amenities -** '+amenities,
      '> **Service Type -** '+safe(op.service||'Snacks and beverages, subject to aircraft and flight',300)
    ];
    break;
  }
  case 'delayed':
    lines=['> '+start+' '+tag+' has been **delayed** until **'+when+'**.',
      '> '+extra+' **This delay** has occurred due to **'+reason+'**. We deeply apologize for any inconvenience and look forward to welcoming you onboard soon!'];
    break;
  case 'rescheduled':
    lines=['> '+start+' '+tag+' has been **rescheduled** until **'+when+'**.',
      '> '+extra+' **On behalf of Delta,** we apologize for any inconvenience. If you need to cancel a current upgrade, please [Contact Us]('+SUPPORT+') for assistance.'];
    break;
  case 'canceled':
    lines=['> '+start+' '+tag+' has been **canceled**.',
      '> '+extra+' **This cancellation** has occurred due to **'+reason+'**. We apologize for the inconvenience. If you reserved an upgrade, please [Contact Us]('+SUPPORT+') for assistance.'];
    break;
  case 'checkin-open':
    lines=['> '+start+' **Check In** for '+tag+' is now **'+game+'**.',
      '> '+extra+' **Please ensure** all relevant documentation is ready to fly! Check-in **closes 10 minutes** before the scheduled departure.'];
    break;
  case 'checkin-closed':
    lines=['> '+start+' **Check In** for '+tag+' is now **closed**.',
      '> '+extra+' **If you missed your flight** and had an upgrade reservation, please [Contact Us]('+SUPPORT+') for assistance.'];
    break;
  case 'arrived':
    lines=['> '+start+' '+tag+' has **officially arrived** at **'+safe(flight.destination,10)+' ('+safe(op.arrival||'On-Time',10)+')**.',
      '> '+extra+' **We thank you** for flying with **Delta Air Lines** today, Member of **SkyTeam Alliance**.'];
    break;
  default:throw new Error('Unknown flight message format');
  }
  return header+lines.join('\n\n')+'\n\n'+FOOTER;
}
function updateFor(preview){
  switch(preview.type){
  case 'ready':return {status:'SCHEDULED'};
  case 'delayed':return {status:'DELAYED',starts_at:preview.time,reason:preview.reason};
  case 'rescheduled':return {status:'SCHEDULED',starts_at:preview.time,reason:preview.reason};
  case 'canceled':return {status:'CANCELLED',reason:preview.reason};
  case 'checkin-open':return {status:'CHECKIN_OPEN'};
  case 'checkin-closed':return {status:'CHECKIN_CLOSED'};
  case 'arrived':return {status:'COMPLETED'};
  default:return null;
  }
}
async function preview(interaction){
  const guildId=process.env.GUILD_ID;
  if(!interaction.inGuild()||(guildId&&interaction.guildId!==guildId)
      ||!interaction.memberPermissions?.has(PermissionFlagsBits.ManageEvents)){
    return interaction.reply({content:'Manage Events permission in the Delta Air Lines server is required.',ephemeral:true});
  }
  await interaction.deferReply({ephemeral:true});
  try{
    const flight=await getFlight(interaction.options.getInteger('flight-id',true));
    const time=interaction.options.getString('time-utc');
    if(time &&(!/^\d{4}-\d\d-\d\dT\d\d:\d\d(?::\d\d)?Z$/.test(time)||!Number.isFinite(Date.parse(time))))throw new Error('Use UTC time 2026-11-01T19:00Z');
    const type=interaction.options.getString('type',true);
    if(['delayed','rescheduled'].includes(type)&&!time)throw new Error('A new UTC time is required for delay/reschedule.');
    const eventLink=allowedLink(interaction.options.getString('event-link'),'event');
    const gameLink=allowedLink(interaction.options.getString('game-link'),'game');
    if(interaction.options.getString('event-link')&&!eventLink)throw new Error('Discord event link must be a discord.com HTTPS URL.');
    if(interaction.options.getString('game-link')&&!gameLink)throw new Error('Game link must be an HTTPS roblox.com URL.');
    const op={flight,type,time,operator:interaction.options.getString('operator'),
      reason:interaction.options.getString('reason'),eventLink,gameLink,
      duration:interaction.options.getString('flight-duration'),seats:interaction.options.getString('seats'),
      amenities:interaction.options.getString('amenities'),service:interaction.options.getString('service'),
      arrival:interaction.options.getString('arrival'),miles:interaction.options.getInteger('miles')};
    const message=details(op);
    if(message.length>1770)throw new Error('This message is too long for the Discord preview. Shorten seat configuration, amenities or reason.');
    const nonce=crypto.randomBytes(12).toString('hex');
    ongoing.set(nonce,{op,message,userId:interaction.user.id,guildId:interaction.guildId,channelId:interaction.channelId,expires:Date.now()+10*60*1000});
    await interaction.editReply({content:'**Flight message preview — not yet published**\n\n'+message,
      components:[{type:1,components:[
        {type:2,style:3,custom_id:'flight-format:publish:'+nonce,label:'Publish'},
        {type:2,style:4,custom_id:'flight-format:cancel:'+nonce,label:'Cancel'},
      ]}]});
  }catch(error){
    console.error('Flight format preview failed:',error);
    await interaction.editReply('Could not preview flight: '+String(error.message||error).slice(0,240));
  }
}
async function action(interaction){
  const [prefix,verb,nonce]=interaction.customId.split(':');
  if(prefix!=='flight-format'||!['publish','cancel'].includes(verb))return false;
  const saved=ongoing.get(nonce);
  if(!saved||Date.now()>saved.expires){
    ongoing.delete(nonce);
    await interaction.reply({content:'Preview expired. Run /format again.',ephemeral:true});return true;
  }
  if(saved.userId!==interaction.user.id||saved.guildId!==interaction.guildId){
    await interaction.reply({content:'Only the original host can publish or cancel this preview.',ephemeral:true});return true;
  }
  if(verb==='cancel'){
    ongoing.delete(nonce);
    await interaction.update({content:'Flight announcement canceled; nothing was posted.',components:[]});
    return true;
  }
  await interaction.deferUpdate();
  try{
    const channel=await interaction.guild.channels.fetch(saved.channelId);
    if(!channel?.isTextBased())throw new Error('Original channel is unavailable');
    const opt={allowedMentions:{parse:[]}};
    // A staff-uploaded image from the website is sent as a Discord file attachment
    // BELOW the text, matching the established Delta announcement style.
    const source=process.env.DELTA_FLIGHT_IMAGE_URL ||
      (process.env.DELTA_WEBSITE_URL?.replace(/\/+$/,'')+'/gallery/media/flight-promo');
    const url=allowedLink(source,'image');
    if(url){
      try{
        const image=await fetch(url,{signal:AbortSignal.timeout(12000)});
        const kind=image.headers.get('content-type')||'';
        const size=Number(image.headers.get('content-length')||0);
        if(image.ok&&kind.startsWith('image/')&&size<3000000){
          const bytes=Buffer.from(await image.arrayBuffer());
          if(bytes.length<3000000){
            const ext=kind.includes('png')?'png':kind.includes('webp')?'webp':'jpg';
            opt.files=[new AttachmentBuilder(bytes,{name:'delta-flight-promo.'+ext})];
          }
        }
      }catch(error){console.warn('Flight picture not yet uploaded; sending text announcement:',error.message);}
    }
    const posted=await channel.send({content:saved.message,...opt});
    const state=updateFor({...saved.op,time:saved.op.time||saved.op.flight.starts_at});
    if(state)await updateFlightStatus(saved.op.flight.id,state);
    ongoing.delete(nonce);
    await interaction.editReply({content:'✅ Published flight message for **'+saved.op.flight.flight_number+
      '**. [View announcement]('+posted.url+')',components:[]});
  }catch(error){
    console.error('Flight format publish failed:',error);
    await interaction.editReply({content:'Message may have posted, but status sync was unsuccessful. Do not press Publish again until checked: '+String(error.message||error).slice(0,250),components:[]});
  }
  return true;
}
module.exports={command,preview,action,details,updateFor,allowedLink,FORMAT_OPTIONS};

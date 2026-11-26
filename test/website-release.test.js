'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {checkWebsiteRelease,CHANNEL_ID,GUILD_ID,BASE_URL} = require('../src/website-release');
const sha='a'.repeat(40);
function fixture(previous=[], guildId=GUILD_ID){
  const sent=[];
  const channel={guildId,isTextBased:()=>true,messages:{fetch:async()=>({some:fn=>previous.some(fn),size:previous.length})},send:async value=>sent.push(value)};
  return {sent,client:{isReady:()=>true,channels:{fetch:async id=>{assert.equal(id,CHANNEL_ID);return channel;}}},fetchImpl:async url=>{assert.equal(url,BASE_URL+'/release-info');return {ok:true,json:async()=>({environment:'production',commit:sha,summary:'Test update'})};}};
}
test('website release routes to designated main guild channel without pings',async()=>{const f=fixture();assert.equal(await checkWebsiteRelease(f.client,f),sha);assert.equal(f.sent.length,1);assert.match(f.sent[0].content,/Website Deployment ID:/);assert.deepEqual(f.sent[0].allowedMentions,{parse:[]});});
test('does not duplicate releases posted by retired HelpDesk monitor',async()=>{const f=fixture([{author:{bot:true},content:'Website Deployment ID: `'+sha+'`'}]);assert.equal(await checkWebsiteRelease(f.client,f),sha);assert.equal(f.sent.length,0);});
test('does not post preview releases or send in other guilds',async()=>{const f=fixture([],'other');await assert.rejects(checkWebsiteRelease(f.client,f));const g=fixture();await assert.rejects(checkWebsiteRelease(g.client,{fetchImpl:async()=>({ok:true,json:async()=>({environment:'preview',commit:sha})})}));assert.equal(f.sent.length+g.sent.length,0);});
test('does not post if the deployment is already seen',async()=>{const f=fixture();assert.equal(await checkWebsiteRelease(f.client,{...f,lastSeen:sha}),sha);assert.equal(f.sent.length,0);});

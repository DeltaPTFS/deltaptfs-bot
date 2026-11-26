'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { webNewsCommand, handleWebNews } = require('../src/web-news');

test('web-news uses the existing website endpoint and defaults to a draft', async () => {
  assert.equal(webNewsCommand.toJSON().name, 'web-news');
  const previous = process.env.DELTA_WEBSITE_URL;
  process.env.DELTA_WEBSITE_URL = 'https://roblox-delta-web.vercel.app';
  try {
    const replies = [];
    const interaction = {inGuild:()=>true,guildId:'123',user:{id:'456'},
      options:{getString:k=>k==='title'?'Test title':'Test body',getBoolean:()=>null},
      deferReply:async()=>{},editReply:async v=>replies.push(v)};
    await handleWebNews(interaction,'123',async (path, data)=>{
      assert.equal(path,'/internal/news/publish');
      assert.deepEqual(data,{actor_id:'456',title:'Test title',body:'Test body',published:false});
      return {id:9,published:false};
    },()=>true);
    assert.match(replies[0].content,/Draft saved/);
  } finally {
    if(previous===undefined) delete process.env.DELTA_WEBSITE_URL; else process.env.DELTA_WEBSITE_URL=previous;
  }
});

test('web-news rejects other servers without calling website', async () => {
  let response;
  await handleWebNews({inGuild:()=>true,guildId:'other',reply:async v=>{response=v}},'main',
    async()=>{throw Error('unexpected website call')},()=>true);
  assert.match(response.content,/main Discord/);
});

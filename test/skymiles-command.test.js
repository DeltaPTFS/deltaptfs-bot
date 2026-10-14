'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const {command,SIGNUP_TEXT,MAIN_GUILD,imageOk,handleWebsiteButton}=require('../src/skymiles-command');

test('/skymiles publishes the website guide in the main Delta guild',()=>{
  assert.equal(command.name,'skymiles');
  assert.equal(MAIN_GUILD,'1538738611988467782');
  assert.match(SIGNUP_TEXT,/https:\/\/roblox-delta-web\.vercel\.app/);
  assert.match(SIGNUP_TEXT,/Verify Your Accounts/);
  assert.match(SIGNUP_TEXT,/Automatic Sign-In/);
  assert.match(SIGNUP_TEXT,/New to SkyMiles/);
  assert.equal(command.options.length,2);
});

test('banner attachments must be small Discord CDN images',()=>{
  assert.equal(imageOk(null),true);
  assert.equal(imageOk({contentType:'image/png',size:1024,url:'https://cdn.discordapp.com/a.png'}),true);
  assert.equal(imageOk({contentType:'image/jpeg',size:9000000,url:'https://cdn.discordapp.com/a.jpg'}),false);
  assert.equal(imageOk({contentType:'text/plain',size:1000,url:'https://cdn.discordapp.com/a.txt'}),false);
  assert.equal(imageOk({contentType:'image/png',size:1000,url:'http://127.0.0.1/a.png'}),false);
});

test('legacy SkyMiles balance and awards remain available under a separate name',()=>{
  const index=readFileSync(join(__dirname,'../src/index.js'),'utf8');
  assert.match(index,/\.setName\('skymiles-ledger'\)/);
  assert.match(index,/handleSkyMilesSignup\(interaction\)/);
  assert.match(index,/handleSkyMiles\(interaction\)/);
});


test('signup post uses a blurple Discord button and attaches it after the final banner',()=>{
  const src=readFileSync(join(__dirname,'../src/skymiles-command.js'),'utf8');
  assert.match(src,/setStyle\(ButtonStyle\.Primary\)/);
  assert.match(src,/setCustomId\('skymiles:open-website'\)/);
  assert.match(src,/if\(bottom\)await channel\.send\(\{files:\[await bannerFile\(bottom,'skymiles-bottom'\)\],components:\[row\]/);
  assert.match(src,/bottom\?\{\}:\{components:\[row\]\}/);
});

test('blue-purple signup button provides a private website link',async()=>{
  const sent=[];
  const fake={
    isButton:()=>true,
    customId:'skymiles:open-website',
    reply:async args=>{sent.push(args);}
  };
  assert.equal(await handleWebsiteButton(fake),true);
  assert.equal(sent.length,1);
  assert.equal(sent[0].ephemeral,true);
  assert.match(JSON.stringify(sent[0].components),/roblox-delta-web\.vercel\.app/);
  assert.equal(await handleWebsiteButton({...fake,customId:'unrelated:button'}),false);
});

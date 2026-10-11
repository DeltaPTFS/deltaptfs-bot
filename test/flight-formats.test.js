'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {details,updateFor,allowedLink,FORMAT_OPTIONS}=require('../src/flight-formats');
const flight={id:4,flight_number:'DAL 2026',departure:'JFK',destination:'ATL',aircraft:'A321neo',gate:'B12',starts_at:'2026-11-11T19:00:00+00:00',miles_reward:100};
test('All eight requested Delta formats exist',()=>assert.deepEqual(FORMAT_OPTIONS.map(x=>x[1]),
  ['ready','itinerary','delayed','rescheduled','canceled','checkin-open','checkin-closed','arrived']));
test('Announcement retains Delta emojis and UTC Hammertime syntax',()=>{
  const message=details({type:'ready',flight,eventLink:'https://discord.com/events/123/456'});
  assert.match(message,/DeltaLogo/);
  assert.match(message,/Get Ready To Go/);
  assert.match(message,/<t:\d+:F>/);
  assert.match(message,/Keep Climbing, Delta Air Lines/);
});
test('Itinerary keeps route and custom aircraft, amenities and seat configuration',()=>{
  const txt=details({type:'itinerary',flight,seats:'16 First, 50 Comfort, 123 Main',amenities:'WiFi, screens',duration:'2h'});
  assert.match(txt,/JFK - ATL/);
  assert.match(txt,/A321neo/);
  assert.match(txt,/16 First/);
});
test('Delay/cancellation statuses update website consistently',()=>{
  assert.equal(updateFor({type:'delayed',time:'2026-11-11T20:00Z'}).status,'DELAYED');
  assert.equal(updateFor({type:'canceled'}).status,'CANCELLED');
  assert.equal(updateFor({type:'arrived'}).status,'COMPLETED');
});
test('Reject non-HTTPS and unrelated event and Roblox links',()=>{
  assert.equal(allowedLink('https://evil.example/phishing','event'),'');
  assert.equal(allowedLink('http://roblox.com/games/123','game'),'');
});

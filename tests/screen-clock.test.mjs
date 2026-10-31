import test from 'node:test';
import assert from 'node:assert/strict';
import {clockKey,getClockDisplay,ScreenClock,watchSystemClock} from '../dist/screen-clock.js';

test('uses local 24-hour time and translates the same date for both languages',()=>{
  const date=new Date(2026,9,31,9,5,42);
  assert.equal(getClockDisplay(date,'zh').time,'09:05');
  assert.equal(getClockDisplay(date,'zh').date,'10月31日 周六');
  assert.equal(getClockDisplay(date,'en').time,'09:05');
  assert.equal(getClockDisplay(date,'en').date,'SAT, OCT 31');
  assert.equal(getClockDisplay(new Date(2026,9,31,0,0)).time,'00:00');
  assert.equal(getClockDisplay(new Date(2026,9,31,12,0)).time,'12:00');
  assert.equal(getClockDisplay(new Date(2026,9,31,23,59)).time,'23:59');
});

test('rolls the date, weekday and year with the device calendar',()=>{
  const before=new Date(2026,11,31,23,59);
  const after=new Date(2027,0,1,0,0);
  assert.equal(getClockDisplay(after,'zh').date,'1月1日 周五');
  assert.equal(getClockDisplay(after,'en').date,'FRI, JAN 01');
  assert.notEqual(clockKey(before),clockKey(after));
  assert.equal(getClockDisplay(new Date(2028,1,29,8,0),'zh').date.startsWith('2月29日'),true);
});

test('minute keys ignore seconds and detect backwards clock and time-zone changes',()=>{
  const a=new Date(2026,9,31,9,41,0),b=new Date(2026,9,31,9,41,59);
  assert.equal(clockKey(a),clockKey(b));
  assert.notEqual(clockKey(a),clockKey(new Date(2026,9,31,9,40)));
  const zone=new Date(a);zone.getTimezoneOffset=()=>a.getTimezoneOffset()-60;
  assert.notEqual(clockKey(a),clockKey(zone));
});

test('failure freezes at the fault moment, through date changes and language switches',()=>{
  let now=new Date(2026,9,31,23,58);
  const clock=new ScreenClock({now:()=>now});
  assert.equal(clock.read().time,'23:58');
  now=new Date(2026,9,31,23,59);clock.pause();
  now=new Date(2026,10,1,0,15);
  assert.equal(clock.read('zh').time,'23:59');
  assert.equal(clock.read('zh').date,'10月31日 周六');
  assert.equal(clock.read('en').date,'SAT, OCT 31');
  assert.equal(clock.read('en').time,'23:59');
  clock.pause();assert.equal(clock.read().time,'23:59');
  clock.resume();assert.equal(clock.read().time,'00:15');
  assert.equal(clock.read('en').date,'SUN, NOV 01');
});

test('frozen calendar fields survive mutation of the Date and device time zone',()=>{
  const date=new Date(2026,9,31,16,27);
  const clock=new ScreenClock({now:()=>date});clock.pause();
  date.setHours(1);date.setDate(1);date.getTimezoneOffset=()=>-60;
  assert.equal(clock.read('en').time,'16:27');assert.equal(clock.read('zh').date,'10月31日 周六');
});

test('watcher refreshes on minute changes, focus and visibility without interval drift',()=>{
  let now=new Date(2026,9,31,9,41),tick,cancelled;
  const doc=Object.assign(new EventTarget(),{hidden:false}),win=new EventTarget(),values=[];
  const stop=watchSystemClock(date=>values.push(getClockDisplay(date).time),{now:()=>now,document:doc,window:win,
    schedule:(callback,ms)=>{assert.equal(ms,1000);tick=callback;return 7;},cancel:id=>{cancelled=id;}});
  assert.deepEqual(values,['09:41']);tick();assert.equal(values.length,1);
  now=new Date(2026,9,31,9,42);tick();assert.equal(values.at(-1),'09:42');
  doc.hidden=true;now=new Date(2026,9,31,10,10);tick();assert.equal(values.at(-1),'09:42');
  doc.hidden=false;doc.dispatchEvent(new Event('visibilitychange'));assert.equal(values.at(-1),'10:10');
  now=new Date(2026,9,31,8,0);win.dispatchEvent(new Event('focus'));assert.equal(values.at(-1),'08:00');
  now=new Date(2026,9,31,11,0);win.dispatchEvent(new Event('pageshow'));assert.equal(values.at(-1),'11:00');
  stop();assert.equal(cancelled,7);const count=values.length;
  now=new Date(2026,9,31,12,0);tick();win.dispatchEvent(new Event('focus'));assert.equal(values.length,count);
});

const DAYS_EN = ['SUN','MON','TUE','WED','THU','FRI','SAT'];
const MONTHS_EN = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
const pad = number => String(number).padStart(2,'0');

function localParts(date) {
  return {year:date.getFullYear(),month:date.getMonth(),day:date.getDate(),weekday:date.getDay(),
    hour:date.getHours(),minute:date.getMinutes(),offset:date.getTimezoneOffset()};
}

function partsKey(parts) {
  return [parts.year,parts.month,parts.day,parts.hour,parts.minute,parts.offset].join(':');
}

export function clockKey(date) {
  // Local calendar values also detect manual clock/time-zone changes, including
  // a clock moving backwards. Never accumulate time from interval ticks.
  return partsKey(localParts(date));
}

function formatParts(parts,language) {
  return {
    time: `${pad(parts.hour)}:${pad(parts.minute)}`,
    date: language === 'zh'
      ? `${parts.month+1}月${parts.day}日 周${'日一二三四五六'[parts.weekday]}`
      : `${DAYS_EN[parts.weekday]}, ${MONTHS_EN[parts.month]} ${pad(parts.day)}`,
    key: `${language}:${partsKey(parts)}`
  };
}

export function getClockDisplay(date = new Date(), language = 'zh') {
  return formatParts(localParts(date),language);
}

export class ScreenClock {
  constructor({now=()=>new Date()}={}) {
    this.now=now;this.paused=false;this.parts=localParts(now());
  }
  read(language='zh',date=this.now()) {
    if(!this.paused) this.parts=localParts(date);
    return formatParts(this.parts,language);
  }
  pause() {
    if(this.paused) return;
    // Store calendar values, not a live Date: a time-zone change while the
    // screen is broken must not move its frozen time, even on language changes.
    this.parts=localParts(this.now());this.paused=true;
  }
  resume() { this.paused=false; }
}

export function watchSystemClock(onUpdate, {now=()=>new Date(),document:doc=globalThis.document,
  window:win=globalThis,schedule=setInterval,cancel=clearInterval}={}) {
  let lastKey,stopped=false;
  const refresh=()=>{
    if(stopped || doc?.hidden) return;
    const date=now(),key=clockKey(date);
    if(key === lastKey) return;
    lastKey=key;
    onUpdate(date);
  };
  const timer=schedule(refresh,1000);
  doc?.addEventListener('visibilitychange',refresh);
  win?.addEventListener?.('focus',refresh);
  win?.addEventListener?.('pageshow',refresh);
  refresh();
  return ()=>{
    stopped=true;cancel(timer);
    doc?.removeEventListener('visibilitychange',refresh);
    win?.removeEventListener?.('focus',refresh);
    win?.removeEventListener?.('pageshow',refresh);
  };
}

import test from 'node:test';
import assert from 'node:assert/strict';
import { HighScoreStore, HIGH_SCORE_COOKIE, HIGH_SCORE_MAX_AGE, readHighScore } from '../dist/high-score.mjs';
import { FoldGame } from '../dist/game.mjs';

function cookieJar(initial = '') {
  let cookie = initial;
  const writes = [];
  return { writes, get cookie() { return cookie; }, set cookie(value) { cookie = value; },
    options: { readCookie: () => cookie, writeCookie: value => {
      writes.push(value);
      const pair = value.split(';')[0];
      cookie = cookie.split(';').map(part => part.trim()).filter(part => part && !part.startsWith(`${HIGH_SCORE_COOKIE}=`)).concat(pair).join('; ');
    } } };
}

test('first visit writes zero with a one-year lifetime, site-wide path and SameSite', () => {
  const jar = cookieJar('other=7');
  const store = new HighScoreStore(jar.options);
  assert.equal(store.best, 0);
  assert.equal(readHighScore(jar.cookie), 0);
  assert.match(jar.cookie, /other=7/);
  assert.equal(HIGH_SCORE_MAX_AGE, 31536000);
  assert.match(jar.writes[0], /Max-Age=31536000; Path=\/; SameSite=Lax/);
  assert.deepEqual(store.record(0), { best: 0, isNewRecord: false });
  assert.equal(jar.writes.length, 1);
});

test('reload reads the saved score without resetting or extending it', () => {
  const jar = cookieJar(`${HIGH_SCORE_COOKIE}=128`);
  assert.equal(new HighScoreStore(jar.options).best, 128);
  assert.equal(jar.writes.length, 0);
});

test('only a strictly higher score updates the cookie and renews its lifetime', () => {
  const jar = cookieJar(`${HIGH_SCORE_COOKIE}=20`);
  const store = new HighScoreStore(jar.options);
  for (const score of [0, 19, 20]) assert.deepEqual(store.record(score), { best: 20, isNewRecord: false });
  assert.equal(jar.writes.length, 0);
  assert.deepEqual(store.record(21), { best: 21, isNewRecord: true });
  assert.equal(jar.writes.length, 1);
  assert.match(jar.writes[0], /Max-Age=31536000/);
  assert.equal(new HighScoreStore(jar.options).best, 21);
  assert.deepEqual(store.record(21), { best: 21, isNewRecord: false });
});

test('malformed, negative, fractional, infinite and oversized cookie values recover to zero', () => {
  for (const value of ['', '-1', '1.2', '1e3', 'NaN', 'Infinity', '9007199254740992', '%31', '20garbage']) {
    const jar = cookieJar(`${HIGH_SCORE_COOKIE}=${value}`);
    assert.equal(readHighScore(jar.cookie), null);
    assert.equal(new HighScoreStore(jar.options).best, 0);
    assert.equal(readHighScore(jar.cookie), 0);
  }
  assert.equal(readHighScore(`other-${HIGH_SCORE_COOKIE}=999; ${HIGH_SCORE_COOKIE}=12; another=3`), 12);
});

test('another tab finishing a better game is rechecked before recording this result', () => {
  const jar = cookieJar(`${HIGH_SCORE_COOKIE}=10`);
  const store = new HighScoreStore(jar.options);
  jar.cookie = `${HIGH_SCORE_COOKIE}=50`;
  assert.deepEqual(store.record(30), { best: 50, isNewRecord: false });
  assert.equal(jar.writes.length, 0);
  assert.deepEqual(store.record(60), { best: 60, isNewRecord: true });
  assert.equal(readHighScore(jar.cookie), 60);
});

test('cookie failure preserves a usable record for the current visit', () => {
  const store = new HighScoreStore({ readCookie: () => { throw new Error('blocked'); }, writeCookie: () => { throw new Error('blocked'); } });
  assert.equal(store.best, 0);
  assert.deepEqual(store.record(23), { best: 23, isNewRecord: true });
  assert.deepEqual(store.record(10), { best: 23, isNewRecord: false });
});

test('HTTPS cookies get Secure, while local HTTP can still persist a record', () => {
  for (const secure of [true, false]) {
    const jar = cookieJar();
    new HighScoreStore({ ...jar.options, secure });
    assert.equal(jar.writes[0].endsWith('; Secure'), secure);
  }
});

test('invalid submitted scores cannot overwrite a saved record', () => {
  const jar = cookieJar(`${HIGH_SCORE_COOKIE}=25`);
  const store = new HighScoreStore(jar.options);
  for (const score of [-1, .5, NaN, Infinity, 9007199254740992, '30']) assert.throws(() => store.record(score), RangeError);
  assert.equal(store.best, 25);
  assert.equal(jar.writes.length, 0);
});

test('game integration records only on game over, and replay keeps the best while clearing wear', async () => {
  const jar = cookieJar();
  const store = new HighScoreStore(jar.options);
  let lastPhase;
  let newRecord = false;
  const game = new FoldGame({ wait: async () => {}, random: () => .9,
    onChange: ({ phase, score }) => {
      if (phase === 'gameover' && lastPhase !== 'gameover') newRecord = store.record(score).isNewRecord;
      lastPhase = phase;
    } });
  await game.cycle(); await game.putDown(); await game.pickUp(); await game.drop(); await game.pickUp();
  assert.equal(game.score, 23);
  assert.equal(store.best, 0);
  assert.equal(readHighScore(jar.cookie), 0);
  game.random = () => 0;
  await game.cycle();
  assert.equal(game.score, 23);
  assert.equal(store.best, 23);
  assert.equal(newRecord, true);
  game.reset();
  assert.equal(game.score, 0);
  assert.equal(game.wearUnits, 0);
  assert.equal(store.best, 23);
  await game.cycle();
  assert.equal(newRecord, false);
  assert.equal(store.best, 23);
  assert.equal(new HighScoreStore(jar.options).best, 23);
});

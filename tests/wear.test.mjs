import test from 'node:test';
import assert from 'node:assert/strict';
import { FoldGame, probabilityWithWear, WEAR_INCREMENTS } from '../dist/game.js';

const immediate = async () => {};

test('wear increases in exact integer units and stays out of UI snapshots', async () => {
  assert.deepEqual(WEAR_INCREMENTS, { fold: 1, table: 5, drop: 100 });
  const game = new FoldGame({ wait: immediate, random: () => .9 });
  for (let i = 0; i < 100; i++) await game.cycle();
  assert.equal(game.wearUnits, 100);
  assert.equal(probabilityWithWear(.01, game.wearUnits), .011);
  assert.equal(probabilityWithWear(.02, game.wearUnits), .021);
  assert.equal(probabilityWithWear(.2, game.wearUnits), .201);
  assert.equal(game.score, 100);
  assert.equal(game.snapshot.probability, .01);
  assert.equal(game.snapshot.tableProbability, .02);
  assert.equal(game.snapshot.dropProbability, .2);
  assert.equal('wearUnits' in game.snapshot, false);
});

test('current action uses prior wear, with a strict threshold; only success adds wear', async () => {
  let draw = .01;
  const game = new FoldGame({ wait: immediate, random: () => draw });
  await game.cycle();
  assert.equal(game.phase, 'ready');
  assert.equal(game.wearUnits, 1);
  draw = .010005;
  await game.cycle();
  assert.equal(game.phase, 'gameover');
  assert.equal(game.score, 1);
  assert.equal(game.wearUnits, 1);

  const boundary = new FoldGame({ wait: immediate, random: () => .9 });
  await boundary.cycle();
  boundary.random = () => probabilityWithWear(.01, 1);
  await boundary.cycle();
  assert.equal(boundary.phase, 'ready');
  assert.equal(boundary.wearUnits, 2);
});

test('all action pairs share wear, including gentle actions affecting later drops', async () => {
  const actions = { fold: 'cycle', table: 'putDown', drop: 'drop' };
  const bases = { fold: .01, table: .02, drop: .2 };
  for (const [first, firstMethod] of Object.entries(actions)) {
    for (const [next, nextMethod] of Object.entries(actions)) {
      const game = new FoldGame({ wait: immediate, random: () => .9 });
      await game[firstMethod]();
      if (first !== 'fold') await game.pickUp();
      const score = game.score;
      const wear = WEAR_INCREMENTS[first];
      game.random = () => bases[next] + wear / 200000;
      await game[nextMethod]();
      assert.equal(game.phase, 'gameover', `${first} raises ${next} risk`);
      assert.equal(game.score, score);
      assert.equal(game.wearUnits, wear);
    }
  }
});

test('five survived drops add half a percentage point to every action', async () => {
  const game = new FoldGame({ wait: immediate, random: () => .9 });
  for (let i = 0; i < 5; i++) { await game.drop(); await game.pickUp(); }
  assert.equal(game.wearUnits, 500);
  assert.equal(game.score, 100);
  assert.equal(probabilityWithWear(.01, game.wearUnits), .015);
  assert.equal(probabilityWithWear(.02, game.wearUnits), .025);
  assert.equal(probabilityWithWear(.2, game.wearUnits), .205);
});

test('pickup and blocked actions neither roll nor add wear', async () => {
  let draws = 0;
  const game = new FoldGame({ wait: immediate, random: () => { draws++; return .9; } });
  await game.putDown();
  for (const action of ['cycle', 'putDown', 'drop']) assert.equal(await game[action](), false);
  await game.pickUp();
  assert.equal(game.wearUnits, 5);
  assert.equal(draws, 1);
  await game.drop();
  for (const action of ['cycle', 'putDown', 'drop']) assert.equal(await game[action](), false);
  await game.pickUp();
  assert.equal(game.wearUnits, 105);
  assert.equal(draws, 2);
});

test('wear is added only after completion, and reset cancels pending wear and rolls', async () => {
  for (const method of ['cycle', 'putDown', 'drop']) {
    const pending = [];
    let draws = 0;
    const game = new FoldGame({ random: () => { draws++; return .9; },
      wait: () => new Promise(resolve => pending.push(resolve)) });
    game.wearUnits = 45;
    const action = game[method]();
    assert.equal(game.wearUnits, 45);
    assert.equal(draws, 0);
    game.reset();
    pending.shift()();
    assert.equal(await action, false);
    assert.equal(game.wearUnits, 0);
    assert.equal(draws, 0);
    assert.equal(game.score, 0);
  }
});

test('reset clears shared wear, including after failure, and keeps configured initial risks', async () => {
  const game = new FoldGame({ wait: immediate, random: () => .9 });
  await game.drop(); await game.pickUp();
  game.random = () => .01;
  await game.cycle();
  assert.equal(game.phase, 'gameover');
  game.reset(.03, .04, .25);
  assert.equal(game.wearUnits, 0);
  assert.equal(game.score, 0);
  game.random = () => .03;
  await game.cycle();
  assert.equal(game.phase, 'ready');
  assert.equal(game.score, 1);
});

test('effective risk caps at 100%, while 0% and 100% remain deterministic', async () => {
  assert.equal(probabilityWithWear(.2, 100000), 1);
  assert.equal(probabilityWithWear(0, 100000), 0);
  assert.equal(probabilityWithWear(1, 100000), 1);
  const game = new FoldGame({ probability: 0, wait: immediate, random: () => 0 });
  game.wearUnits = 100000;
  for (let i = 0; i < 3; i++) await game.cycle();
  assert.equal(game.score, 3);
  assert.equal(game.wearUnits, 100000);
  game.reset(1);
  game.random = () => .999999;
  await game.cycle();
  assert.equal(game.phase, 'gameover');
  assert.equal(game.score, 0);
});

test('accumulated 100% risk still rolls exactly once, only at the existing completion point', async () => {
  for (const method of ['cycle', 'putDown', 'drop']) {
    const pending = [];
    let draws = 0;
    const game = new FoldGame({ random: () => { draws++; return .999999; },
      wait: () => new Promise(resolve => pending.push(resolve)) });
    game.wearUnits = 100000;
    const action = game[method]();
    const phases = method === 'cycle' ? ['folding', 'closed', 'unfolding'] : [method === 'drop' ? 'dropping' : 'placing'];
    for (const phase of phases) {
      assert.equal(game.phase, phase);
      assert.equal(draws, 0);
      assert.equal(game.wearUnits, 100000);
      pending.shift()();
      await new Promise(resolve => setImmediate(resolve));
    }
    assert.equal(draws, 1);
    assert.equal(game.phase, 'damaged');
    pending.shift()();
    await action;
    assert.equal(game.phase, 'gameover');
    assert.equal(draws, 1);
  }
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { FoldGame, DEFAULT_PROBABILITY } from '../dist/game.mjs';

const immediate = async () => {};
function controlled(probability) {
  const pending = [];
  const history = [];
  let draws = 0;
  const game = new FoldGame({ probability, random:()=>{draws++;return 0;},
    wait: ms => new Promise(resolve => pending.push({ms,resolve})), onChange:s=>history.push(s) });
  const advance = async () => { pending.shift().resolve(); await new Promise(resolve=>setImmediate(resolve)); };
  return {game,pending,history,advance,get draws(){return draws;}};
}

test('0%: each completed cycle scores once, no failures over 100 cycles',async()=>{
  let draws=0;
  const game=new FoldGame({probability:0,wait:immediate,random:()=>{draws++;return 0;}});
  for(let i=1;i<=100;i++){await game.cycle();assert.equal(game.score,i);assert.equal(game.phase,'ready');}
  assert.equal(draws,100);
});

test('100%: no draw while folding; one draw after unfolding, then shake and game over',async()=>{
  const c=controlled(1);
  const cycle=c.game.cycle();
  assert.equal(c.game.phase,'folding');assert.equal(c.pending[0].ms,600);assert.equal(c.draws,0);
  assert.equal(await c.game.cycle(),false);
  await c.advance();assert.equal(c.game.phase,'closed');assert.equal(c.pending[0].ms,150);assert.equal(c.draws,0);
  await c.advance();assert.equal(c.game.phase,'unfolding');assert.equal(c.pending[0].ms,600);assert.equal(c.draws,0);
  await c.advance();assert.equal(c.game.phase,'damaged');assert.equal(c.pending[0].ms,450);assert.equal(c.draws,1);
  assert.equal(c.game.score,0);
  await c.advance();await cycle;assert.equal(c.game.phase,'gameover');assert.equal(await c.game.cycle(),false);assert.equal(c.draws,1);
});

test('1% threshold is strict and default is 0.01',async()=>{
  assert.equal(DEFAULT_PROBABILITY,.01);
  for(const [draw,failed] of [[0,true],[.009999,true],[.01,false],[.9999,false]]){
    const game=new FoldGame({random:()=>draw,wait:immediate});await game.cycle();
    assert.equal(game.phase,failed?'gameover':'ready');assert.equal(game.score,failed?0:1);
  }
});

test('failure keeps previous successful score, replay resets and applies new probability',async()=>{
  const draws=[.5,.5,0];
  const game=new FoldGame({wait:immediate,random:()=>draws.shift()});
  await game.cycle();await game.cycle();await game.cycle();
  assert.equal(game.phase,'gameover');assert.equal(game.score,2);
  game.reset(0);assert.deepEqual(game.snapshot,{phase:'ready',score:0,probability:0,tableProbability:.02,onTable:false});
  await game.cycle();assert.equal(game.score,1);
});

test('reset during any asynchronous phase invalidates old cycle without stale updates',async()=>{
  for(const phaseIndex of [0,1,2,3]){
    const c=controlled(1);const cycle=c.game.cycle();
    for(let i=0;i<phaseIndex;i++)await c.advance();
    c.game.reset(0);const drawCount=c.draws;
    await c.advance();assert.equal(await cycle,false);
    assert.deepEqual(c.game.snapshot,{phase:'ready',score:0,probability:0,tableProbability:.02,onTable:false});assert.equal(c.draws,drawCount);
  }
});

test('probabilities reject NaN, infinity and out-of-range values',()=>{
  for(const probability of [NaN,Infinity,-.1,1.1])assert.throws(()=>new FoldGame({probability}),RangeError);
});

test('reduced motion still executes full cycle and failure outcome',async()=>{
  const delays=[];const game=new FoldGame({probability:1,wait:async ms=>delays.push(ms),durations:{fold:120,hold:0,unfold:120,shake:0}});
  await game.cycle();assert.deepEqual(delays,[120,0,120,0]);assert.equal(game.phase,'gameover');
});

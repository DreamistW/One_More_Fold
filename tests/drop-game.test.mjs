import test from 'node:test';
import assert from 'node:assert/strict';
import {FoldGame,DEFAULT_DROP_PROBABILITY,MIN_DROP_PROBABILITY} from '../dist/game.mjs';

const immediate=async()=>{};
function controlled({dropProbability=.2,draw=.5}={}) {
  const pending=[];let draws=0;
  const game=new FoldGame({dropProbability,random:()=>{draws++;return draw;},
    wait:ms=>new Promise(resolve=>pending.push({ms,resolve}))});
  const advance=async()=>{pending.shift().resolve();await new Promise(resolve=>setImmediate(resolve));};
  return {game,pending,advance,get draws(){return draws;}};
}

test('drop risk defaults to 20%, enforces its minimum, and invalid reset is atomic',async()=>{
  assert.equal(DEFAULT_DROP_PROBABILITY,.2);assert.equal(MIN_DROP_PROBABILITY,.2);
  for(const dropProbability of [0,.02,.1,.199999,-1,NaN,Infinity,1.001])assert.throws(()=>new FoldGame({dropProbability}),RangeError);
  const game=new FoldGame({wait:immediate,random:()=>.5});await game.putDown();const before=game.snapshot;
  assert.throws(()=>game.reset(0,.02,.19),RangeError);assert.deepEqual(game.snapshot,before);
});

test('a survived drop adds twenty exactly once; pickup is free and restores all actions',async()=>{
  let draws=0;const game=new FoldGame({wait:immediate,random:()=>{draws++;return .5;}});
  for(let i=1;i<=3;i++){
    assert.equal(await game.drop(),true);assert.equal(game.phase,'onFloor');assert.equal(game.score,i*20);
    assert.equal(game.onFloor,true);assert.equal(game.onTable,false);
    assert.equal(await game.cycle(),false);assert.equal(await game.putDown(),false);assert.equal(await game.drop(),false);
    assert.equal(draws,i);
    assert.equal(await game.pickUp(),true);assert.equal(game.phase,'ready');assert.equal(game.onFloor,false);
    assert.equal(game.score,i*20);assert.equal(draws,i);
  }
});

test('dropping waits for landing, locks all actions, and floor pickup uses a longer return',async()=>{
  const c=controlled();const dropped=c.game.drop();
  assert.equal(c.game.phase,'dropping');assert.equal(c.pending[0].ms,900);assert.equal(c.draws,0);
  for(const action of ['cycle','putDown','drop','pickUp'])assert.equal(await c.game[action](),false);
  await c.advance();await dropped;assert.equal(c.game.phase,'onFloor');assert.equal(c.game.score,20);assert.equal(c.draws,1);
  const picked=c.game.pickUp();assert.equal(c.game.phase,'liftingFloor');assert.equal(c.pending[0].ms,800);
  for(const action of ['cycle','putDown','drop','pickUp'])assert.equal(await c.game[action](),false);
  await c.advance();await picked;assert.equal(c.game.phase,'ready');assert.equal(c.game.score,20);assert.equal(c.draws,1);
});

test('fold, table placement, table rest and table pickup all block dropping',async()=>{
  const c=controlled();const folded=c.game.cycle();
  for(let i=0;i<3;i++){assert.equal(await c.game.drop(),false);await c.advance();}await folded;
  const table=c.game.putDown();assert.equal(await c.game.drop(),false);await c.advance();await table;
  assert.equal(await c.game.drop(),false);const picked=c.game.pickUp();assert.equal(await c.game.drop(),false);
  await c.advance();await picked;assert.equal(c.game.score,3);
});

test('drop threshold is strict and independent of the other two probabilities',async()=>{
  for(const [draw,failed] of [[0,true],[.199999,true],[.2,false],[.9,false]]){
    const game=new FoldGame({probability:1,tableProbability:1,dropProbability:.2,random:()=>draw,wait:immediate});
    await game.drop();assert.equal(game.phase,failed?'gameover':'onFloor');assert.equal(game.score,failed?0:20);
  }
  const game=new FoldGame({probability:0,tableProbability:.02,dropProbability:1,random:()=>.5,wait:immediate});
  await game.cycle();await game.putDown();await game.pickUp();assert.equal(game.score,3);
  await game.drop();assert.equal(game.phase,'gameover');assert.equal(game.score,3);assert.equal(game.onFloor,true);
  for(const action of ['cycle','putDown','drop','pickUp'])assert.equal(await game[action](),false);
});

test('failed drop uses damage and game-over states without awarding points',async()=>{
  const c=controlled({dropProbability:1});const dropped=c.game.drop();
  await c.advance();assert.equal(c.game.phase,'damaged');assert.equal(c.game.score,0);assert.equal(c.draws,1);
  assert.equal(c.pending[0].ms,450);await c.advance();await dropped;
  assert.equal(c.game.phase,'gameover');assert.equal(c.game.onFloor,true);assert.equal(c.game.onTable,false);
  c.game.reset(0,.03,.2);assert.deepEqual(c.game.snapshot,{phase:'ready',score:0,probability:0,tableProbability:.03,onTable:false,dropProbability:.2,onFloor:false});
});

test('restart cancels pending fall, floor pickup and damage completion',async()=>{
  for(const phase of ['dropping','liftingFloor','damaged']){
    const c=controlled({dropProbability:phase==='damaged'?1:.2});let action=c.game.drop();
    if(phase!=='dropping'){await c.advance();if(phase==='liftingFloor'){await action;action=c.game.pickUp();}}
    assert.equal(c.game.phase,phase);const draws=c.draws;c.game.reset(0,.02,.2);
    await c.advance();assert.equal(await action,false);assert.equal(c.game.phase,'ready');assert.equal(c.game.score,0);
    assert.equal(c.game.onFloor,false);assert.equal(c.game.onTable,false);assert.equal(c.draws,draws);
  }
});

test('reduced-motion drop and pickup still score twenty and keep actions exclusive',async()=>{
  const delays=[];const game=new FoldGame({random:()=>.5,wait:async ms=>delays.push(ms),durations:{drop:0,floorLift:0}});
  await game.drop();assert.equal(game.phase,'onFloor');assert.equal(await game.putDown(),false);
  await game.pickUp();assert.equal(game.phase,'ready');assert.equal(game.score,20);assert.deepEqual(delays,[0,0]);
});

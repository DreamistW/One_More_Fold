import test from 'node:test';
import assert from 'node:assert/strict';
import {FoldGame,DEFAULT_TABLE_PROBABILITY,MIN_TABLE_PROBABILITY} from '../dist/game.mjs';

const immediate=async()=>{};
function controlled({tableProbability=.02,draw=.5}={}) {
  const pending=[];let draws=0;
  const game=new FoldGame({tableProbability,random:()=>{draws++;return draw;},
    wait:ms=>new Promise(resolve=>pending.push({ms,resolve}))});
  const advance=async()=>{pending.shift().resolve();await new Promise(resolve=>setImmediate(resolve));};
  return {game,pending,advance,get draws(){return draws;}};
}

test('table risk defaults to 2% and rejects any probability below 2%',()=>{
  assert.equal(DEFAULT_TABLE_PROBABILITY,.02);assert.equal(MIN_TABLE_PROBABILITY,.02);
  for(const tableProbability of [0,.01,.019999,-1,NaN,Infinity,1.001]) {
    assert.throws(()=>new FoldGame({tableProbability}),RangeError);
  }
  const game=new FoldGame();const before=game.snapshot;
  assert.throws(()=>game.reset(0,.01),RangeError);assert.deepEqual(game.snapshot,before);
});

test('putting down scores exactly two once; picking up has no risk or score',async()=>{
  let draws=0;
  const game=new FoldGame({random:()=>{draws++;return .5;},wait:immediate});
  for(let i=1;i<=5;i++) {
    assert.equal(await game.putDown(),true);
    assert.equal(game.phase,'onTable');assert.equal(game.onTable,true);assert.equal(game.score,2*i);
    assert.equal(await game.putDown(),false);assert.equal(await game.cycle(),false);
    assert.equal(draws,i);
    assert.equal(await game.pickUp(),true);assert.equal(game.phase,'ready');assert.equal(game.onTable,false);
    assert.equal(game.score,2*i);assert.equal(draws,i);
  }
});

test('placing, resting on table and lifting all block fold and repeated actions',async()=>{
  const c=controlled();const placed=c.game.putDown();
  assert.equal(c.game.phase,'placing');assert.equal(c.pending[0].ms,700);assert.equal(c.draws,0);
  assert.equal(await c.game.cycle(),false);assert.equal(await c.game.putDown(),false);assert.equal(await c.game.pickUp(),false);
  await c.advance();await placed;
  assert.equal(c.game.score,2);assert.equal(c.draws,1);assert.equal(c.game.phase,'onTable');
  const lifted=c.game.pickUp();assert.equal(c.game.phase,'lifting');assert.equal(c.pending[0].ms,600);
  assert.equal(await c.game.cycle(),false);assert.equal(await c.game.putDown(),false);assert.equal(await c.game.pickUp(),false);
  await c.advance();await lifted;
  assert.equal(c.game.phase,'ready');assert.equal(c.draws,1);assert.equal(c.game.score,2);
});

test('folding blocks a table action throughout its cycle',async()=>{
  const c=controlled();const cycle=c.game.cycle();
  for(let i=0;i<3;i++) { assert.equal(await c.game.putDown(),false);assert.equal(await c.game.pickUp(),false);await c.advance(); }
  await cycle;assert.equal(c.game.phase,'ready');assert.equal(c.game.score,1);assert.equal(c.game.onTable,false);
});

test('table threshold is strict; fold and table probabilities are independent',async()=>{
  for(const [draw,failed] of [[0,true],[.019999,true],[.02,false],[.9,false]]){
    const game=new FoldGame({probability:1,tableProbability:.02,random:()=>draw,wait:immediate});
    await game.putDown();assert.equal(game.phase,failed?'gameover':'onTable');assert.equal(game.score,failed?0:2);
  }
  const game=new FoldGame({probability:0,tableProbability:1,random:()=>.5,wait:immediate});
  await game.cycle();assert.equal(game.score,1);
  await game.putDown();assert.equal(game.phase,'gameover');assert.equal(game.score,1);assert.equal(game.onTable,true);
  assert.equal(await game.pickUp(),false);assert.equal(await game.cycle(),false);assert.equal(await game.putDown(),false);
});

test('table failure waits for placement then shows the shared damage and game-over states',async()=>{
  const c=controlled({tableProbability:1});const action=c.game.putDown();
  await c.advance();assert.equal(c.game.phase,'damaged');assert.equal(c.game.score,0);assert.equal(c.draws,1);
  assert.equal(c.pending[0].ms,450);assert.equal(await c.game.pickUp(),false);
  await c.advance();await action;assert.equal(c.game.phase,'gameover');assert.equal(c.game.onTable,true);
  c.game.reset(0,.03);assert.deepEqual(c.game.snapshot,{phase:'ready',score:0,probability:0,tableProbability:.03,onTable:false});
});

test('restart cancels stale table placement, lifting and failure waits',async()=>{
  for(const phase of ['placing','lifting','damaged']) {
    const c=controlled({tableProbability:phase==='damaged'?1:.02});
    let action=c.game.putDown();
    if(phase!=='placing') { await c.advance();if(phase==='lifting'){await action;action=c.game.pickUp();} }
    assert.equal(c.game.phase,phase);
    const draws=c.draws;c.game.reset(0,.04);
    await c.advance();assert.equal(await action,false);
    assert.equal(c.game.phase,'ready');assert.equal(c.game.onTable,false);assert.equal(c.game.score,0);assert.equal(c.draws,draws);
  }
});

test('reduced-motion placement and pickup preserve scoring and mutual exclusion',async()=>{
  const delays=[];const game=new FoldGame({random:()=>.5,wait:async ms=>delays.push(ms),durations:{place:0,lift:0}});
  await game.putDown();assert.equal(game.phase,'onTable');assert.equal(await game.cycle(),false);
  await game.pickUp();assert.equal(game.phase,'ready');assert.equal(game.score,2);assert.deepEqual(delays,[0,0]);
});

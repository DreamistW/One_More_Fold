import test from 'node:test';
import assert from 'node:assert/strict';
import {detectPostureSource,PhysicalFoldControl} from '../dist/device-posture.mjs';
import {FoldGame} from '../dist/game.mjs';

class FakePosture extends EventTarget {
  constructor(type='continuous'){super();this.type=type;}
  change(type){this.type=type;this.dispatchEvent(new Event('change'));}
}
class FakeDocument extends EventTarget {
  hidden=false;
  visibility(hidden){this.hidden=hidden;this.dispatchEvent(new Event('visibilitychange'));}
}
function fixture(initial='continuous') {
  const posture=new FakePosture(initial),doc=new FakeDocument(),timers=new Map();
  let next=0,cycles=0,playable=true;
  const states=[];
  const source=detectPostureSource({isSecureContext:true,navigator:{devicePosture:posture}});
  const control=new PhysicalFoldControl({source,document:doc,canPlay:()=>playable,
    onCycle:()=>cycles++,onState:s=>states.push(s),
    schedule:callback=>{timers.set(++next,callback);return next;},cancel:id=>timers.delete(id)});
  const flush=()=>{const callbacks=[...timers.values()];timers.clear();callbacks.forEach(callback=>callback());};
  return {control,posture,doc,states,flush,
    change:type=>{posture.change(type);flush();},get cycles(){return cycles;},
    busy:value=>{playable=!value;}};
}

test('requires a stable half-fold followed by unfolding, with one callback per round',()=>{
  const f=fixture();assert.equal(f.cycles,0);
  f.change('folded');assert.equal(f.cycles,0);assert.equal(f.control.snapshot.armed,true);
  f.change('continuous');assert.equal(f.cycles,1);
  f.change('continuous');f.change('continuous');assert.equal(f.cycles,1);
  f.change('folded');f.change('folded');f.change('continuous');assert.equal(f.cycles,2);
});
test('loading while folded and then unfolding does not manufacture a round',()=>{
  const f=fixture('folded');f.change('continuous');assert.equal(f.cycles,0);
  f.change('folded');f.change('continuous');assert.equal(f.cycles,1);
});
test('rapid bouncing is debounced before arming',()=>{
  const f=fixture();f.posture.change('folded');f.posture.change('continuous');f.flush();
  assert.equal(f.cycles,0);assert.equal(f.control.snapshot.armed,false);
});
test('manual actions or restart cancel an armed physical cycle',()=>{
  const f=fixture();f.change('folded');f.control.reset();f.change('continuous');assert.equal(f.cycles,0);
});
test('busy or game-over state drops physical input instead of queuing rounds',()=>{
  const f=fixture();f.busy(true);f.change('folded');f.busy(false);f.change('continuous');assert.equal(f.cycles,0);
  f.change('folded');f.busy(true);f.change('continuous');f.busy(false);assert.equal(f.cycles,0);
  f.change('folded');f.change('continuous');assert.equal(f.cycles,1);
});
test('hidden pages and restoration reset the baseline without phantom input',()=>{
  const f=fixture();f.change('folded');f.doc.visibility(true);f.change('continuous');
  f.doc.visibility(false);assert.equal(f.cycles,0);assert.equal(f.control.snapshot.armed,false);
  f.change('folded');f.change('continuous');assert.equal(f.cycles,1);
});
test('disabling cancels pending input, re-enabling requires a fresh sequence',()=>{
  const f=fixture();f.posture.change('folded');f.control.setEnabled(false);f.flush();f.change('continuous');
  assert.equal(f.cycles,0);f.control.setEnabled(true);f.change('folded');f.change('continuous');assert.equal(f.cycles,1);
});
test('invalid posture data and destroyed controllers cannot trigger a round',()=>{
  const f=fixture();f.change('folded');f.change('unknown');f.change('continuous');assert.equal(f.cycles,0);
  f.posture.change('folded');f.control.destroy();f.flush();f.change('continuous');assert.equal(f.cycles,0);
});
test('LAN HTTP reports HTTPS requirement even if an API-shaped object is present',()=>{
  assert.equal(detectPostureSource({isSecureContext:false,navigator:{devicePosture:new FakePosture()}}).availability,'insecure');
});
test('an API or a recognised CSS posture signal is required; unknown media queries do not count',()=>{
  const query=()=>Object.assign(new EventTarget(),{matches:false,media:'(device-posture: folded)'});
  assert.equal(detectPostureSource({isSecureContext:true,navigator:{},matchMedia:query}).availability,'unsupported');
  assert.equal(detectPostureSource({isSecureContext:true,navigator:{devicePosture:new FakePosture()}}).source,'api');
});
test('CSS fallback subscribes to both supported posture queries and can unsubscribe',()=>{
  const folded=Object.assign(new EventTarget(),{matches:false});
  const continuous=Object.assign(new EventTarget(),{matches:true});
  const source=detectPostureSource({isSecureContext:true,navigator:{},matchMedia:q=>q.includes(': folded')?folded:continuous});
  assert.equal(source.source,'media');assert.equal(source.read(),'continuous');
  let events=0;const stop=source.subscribe(()=>events++);
  folded.matches=true;continuous.matches=false;
  folded.dispatchEvent(new Event('change'));continuous.dispatchEvent(new Event('change'));
  assert.equal(source.read(),'folded');assert.equal(events,2);stop();folded.dispatchEvent(new Event('change'));assert.equal(events,2);
});
test('runtime read errors disable the feature without breaking manual gameplay',()=>{
  const f=fixture();Object.defineProperty(f.posture,'type',{get(){throw new Error('Unavailable sensor');}});
  f.control.reset();assert.equal(f.control.snapshot.availability,'error');assert.equal(f.control.snapshot.enabled,false);
});
test('physical round invokes the existing game cycle and preserves scoring and failure rules',async()=>{
  const f=fixture(),runs=[];
  const game=new FoldGame({probability:0,wait:async()=>{}});
  f.control.canPlay=()=>game.phase==='ready';
  f.control.onCycle=()=>runs.push(game.cycle());
  f.change('folded');f.change('continuous');await Promise.all(runs);
  assert.equal(game.score,1);assert.equal(game.phase,'ready');
  game.reset(1);f.change('folded');f.change('continuous');await Promise.all(runs);
  assert.equal(game.phase,'gameover');assert.equal(game.score,0);
  f.change('folded');f.change('continuous');assert.equal(runs.length,2);
});

test('physical folds on the table are discarded and resume only after pickup',async()=>{
  const f=fixture(),runs=[];
  const game=new FoldGame({probability:0,random:()=>.5,wait:async()=>{}});
  f.control.canPlay=()=>game.phase==='ready';
  f.control.onCycle=()=>runs.push(game.cycle());
  await game.putDown();assert.equal(game.score,2);
  f.change('folded');f.change('continuous');assert.equal(runs.length,0);assert.equal(game.phase,'onTable');
  await game.pickUp();f.change('folded');f.change('continuous');await Promise.all(runs);
  assert.equal(runs.length,1);assert.equal(game.score,3);
});

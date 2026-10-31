import test from 'node:test';
import assert from 'node:assert/strict';
import {isFoldableDevice,watchFoldableDevice} from '../dist/foldable-device.js';

function fixture() {
  const posture=Object.assign(new EventTarget(),{type:'continuous'});
  const doc=Object.assign(new EventTarget(),{hidden:false});
  const queries=new Map();
  const env=Object.assign(new EventTarget(),{navigator:{devicePosture:posture},document:doc,
    viewport:{segments:[{}]},innerWidth:1920,innerHeight:1080,
    matchMedia:query=>{
      if(!queries.has(query)) queries.set(query,Object.assign(new EventTarget(),{matches:false}));
      return queries.get(query);
    }});
  return {env,posture,doc,queries};
}

test('desktop and ordinary phones stay hidden even when they expose the posture API',()=>{
  const {env}=fixture();assert.equal(isFoldableDevice(env),false);
  env.innerWidth=390;env.innerHeight=844;env.navigator.maxTouchPoints=5;
  assert.equal(isFoldableDevice(env),false);
  assert.equal(isFoldableDevice({}),false);
});

test('actual folded posture or multiple viewport segments identify a folding display',()=>{
  const {env,posture}=fixture();posture.type='folded';assert.equal(isFoldableDevice(env),true);
  posture.type='continuous';env.viewport.segments=[{},{}];assert.equal(isFoldableDevice(env),true);
  env.viewport.segments=[{},{},{}];assert.equal(isFoldableDevice(env),true);
});

test('standard posture and segment media queries also identify foldable displays',()=>{
  for(const signal of ['(device-posture: folded)','(horizontal-viewport-segments: 2)','(vertical-viewport-segments: 2)']){
    const {env}=fixture();env.navigator={};env.viewport=undefined;
    env.matchMedia(signal).matches=true;assert.equal(isFoldableDevice(env),true);
  }
});

test('first fold reveals controls, then unfolding and repeated events keep them visible',()=>{
  const {env,posture}=fixture(),values=[];
  const stop=watchFoldableDevice(value=>values.push(value),{env});
  assert.deepEqual(values,[false]);
  posture.type='folded';posture.dispatchEvent(new Event('change'));
  assert.deepEqual(values,[false,true]);
  posture.type='continuous';posture.dispatchEvent(new Event('change'));env.dispatchEvent(new Event('resize'));
  assert.deepEqual(values,[false,true]);stop();
});

test('resize and rotation alone never reveal controls; new segment evidence does',()=>{
  const {env}=fixture(),values=[];const stop=watchFoldableDevice(value=>values.push(value),{env});
  env.innerWidth=844;env.innerHeight=390;env.dispatchEvent(new Event('resize'));
  assert.deepEqual(values,[false]);
  env.viewport.segments=[{},{}];env.dispatchEvent(new Event('resize'));
  assert.deepEqual(values,[false,true]);stop();
});

test('CSS change events work without navigator posture, including insecure contexts',()=>{
  const {env}=fixture();env.navigator={};env.isSecureContext=false;
  const values=[];const stop=watchFoldableDevice(value=>values.push(value),{env});
  const query=env.matchMedia('(device-posture: folded)');query.matches=true;query.dispatchEvent(new Event('change'));
  assert.deepEqual(values,[false,true]);stop();
});

test('hidden pages recheck on visibility, and stopping removes subscriptions',()=>{
  const {env,doc,posture}=fixture(),values=[];doc.hidden=true;posture.type='folded';
  const stop=watchFoldableDevice(value=>values.push(value),{env});assert.deepEqual(values,[false]);
  doc.hidden=false;doc.dispatchEvent(new Event('visibilitychange'));assert.deepEqual(values,[false,true]);stop();
  const next=fixture(),later=[];const cancel=watchFoldableDevice(value=>later.push(value),{env:next.env});cancel();
  next.posture.type='folded';next.posture.dispatchEvent(new Event('change'));next.env.dispatchEvent(new Event('resize'));
  assert.deepEqual(later,[false]);
});

test('unavailable signals do not throw or infer a device from capability alone',()=>{
  const {env}=fixture();Object.defineProperty(env.navigator,'devicePosture',{get(){throw new Error('Denied');}});
  Object.defineProperty(env,'viewport',{get(){throw new Error('Unsupported');}});
  assert.equal(isFoldableDevice(env),false);
  const values=[];const stop=watchFoldableDevice(value=>values.push(value),{env});
  assert.deepEqual(values,[false]);stop();
});

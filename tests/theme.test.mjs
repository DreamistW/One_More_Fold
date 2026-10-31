import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {THEME_KEY,normalizeTheme,resolveTheme,ThemeController} from '../dist/theme.js';

function fixture(saved=null,systemDark=false) {
  const values=new Map(saved===null?[]:[[THEME_KEY,saved]]);
  const media=Object.assign(new EventTarget(),{matches:systemDark});
  const storage={getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value)};
  const env=Object.assign(new EventTarget(),{localStorage:storage,matchMedia:()=>media});
  return {env,media,values,storage,change:dark=>{media.matches=dark;media.dispatchEvent(new Event('change'));}};
}

test('fresh visits and invalid stored choices default to system',()=>{
  for(const value of [null,undefined,'','invalid'])assert.equal(normalizeTheme(value),'system');
  const f=fixture(null,true),states=[];const theme=new ThemeController({env:f.env,onChange:s=>states.push(s)});
  assert.deepEqual(states,[{preference:'system',resolved:'dark'}]);
  assert.equal(f.values.has(THEME_KEY),false);theme.destroy();
});

test('system mode responds to system changes, manual modes stay fixed',()=>{
  const f=fixture(),states=[];const theme=new ThemeController({env:f.env,onChange:s=>states.push(s)});
  f.change(true);assert.equal(theme.snapshot.resolved,'dark');
  theme.setPreference('light');const count=states.length;f.change(false);f.change(true);
  assert.equal(theme.snapshot.resolved,'light');assert.equal(states.length,count);
  theme.setPreference('dark');f.change(false);assert.equal(theme.snapshot.resolved,'dark');
  theme.setPreference('system');assert.equal(theme.snapshot.resolved,'light');theme.destroy();
});

test('manual and system choices survive a new controller visit',()=>{
  for(const preference of ['dark','light','system']){
    const f=fixture(null,true),first=new ThemeController({env:f.env});
    first.setPreference(preference);first.destroy();
    const second=new ThemeController({env:f.env});
    assert.deepEqual(second.snapshot,{preference,resolved:resolveTheme(preference,true)});second.destroy();
  }
});

test('storage read/write failures do not prevent changing the current theme',()=>{
  const f=fixture(null,true);
  f.storage.getItem=()=>{throw new Error('Read blocked');};f.storage.setItem=()=>{throw new Error('Write blocked');};
  const theme=new ThemeController({env:f.env});assert.equal(theme.snapshot.preference,'system');
  theme.setPreference('light');assert.equal(theme.snapshot.resolved,'light');theme.destroy();
  Object.defineProperty(f.env,'localStorage',{get(){throw new Error('Access blocked');}});
  const blocked=new ThemeController({env:f.env});blocked.setPreference('dark');assert.equal(blocked.snapshot.resolved,'dark');blocked.destroy();
});

test('other-tab theme changes and clearing preferences update this tab',()=>{
  const f=fixture('dark',false),theme=new ThemeController({env:f.env});
  const send=(key,newValue)=>f.env.dispatchEvent(Object.assign(new Event('storage'),{key,newValue,storageArea:f.storage}));
  send('unrelated','light');assert.equal(theme.snapshot.preference,'dark');
  send(THEME_KEY,'light');assert.equal(theme.snapshot.resolved,'light');
  f.values.clear();send(null,null);assert.deepEqual(theme.snapshot,{preference:'system',resolved:'light'});
  theme.destroy();
});

test('destroy removes system and storage subscriptions',()=>{
  const f=fixture(),states=[];const theme=new ThemeController({env:f.env,onChange:s=>states.push(s)});theme.destroy();
  f.change(true);f.env.dispatchEvent(Object.assign(new Event('storage'),{key:THEME_KEY,newValue:'dark'}));
  assert.equal(states.length,1);
});

test('prepaint bootstrap agrees with the controller for saved and system preferences',()=>{
  const source=readFileSync(new URL('../dist/theme-init.js',import.meta.url),'utf8');
  for(const saved of [null,'dark','light','system','invalid'])for(const systemDark of [false,true]){
    const root={dataset:{},style:{}},meta={setAttribute:(_key,value)=>{meta.color=value;}};
    runInNewContext(source,{localStorage:{getItem:()=>saved},window:{matchMedia:()=>({matches:systemDark})},
      document:{documentElement:root,querySelector:()=>meta}});
    assert.equal(root.dataset.themePreference,normalizeTheme(saved));
    assert.equal(root.dataset.theme,resolveTheme(saved,systemDark));
    assert.equal(root.style.colorScheme,root.dataset.theme);
    assert.equal(meta.color,root.dataset.theme==='dark'?'#000000':'#eeece3');
  }
});

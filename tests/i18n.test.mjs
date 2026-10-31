import test from 'node:test';
import assert from 'node:assert/strict';
import {chooseLanguage, messages} from '../dist/i18n.js';

test('saved explicit preference takes priority over browser environment',()=>{
  assert.equal(chooseLanguage('zh',['en-US']),'zh');
  assert.equal(chooseLanguage('en',['zh-HK']),'en');
});
test('matches regional Chinese and English in browser preference order',()=>{
  for(const region of ['zh-CN','zh-TW','zh-HK','zh-Hant','ZH_hans']) assert.equal(chooseLanguage(null,[region]),'zh');
  assert.equal(chooseLanguage(null,['en-GB','zh-CN']),'en');
  assert.equal(chooseLanguage(null,['fr-FR','zh-HK','en-US']),'zh');
});
test('invalid saved preferences and unsupported environments fall back safely',()=>{
  assert.equal(chooseLanguage('fr',['zh-CN']),'zh');
  assert.equal(chooseLanguage(null,['ja-JP']),'en');
  assert.equal(chooseLanguage(undefined,[]),'en');
});
test('both translations cover the same UI and game phases',()=>{
  assert.deepEqual(Object.keys(messages.zh).sort(),Object.keys(messages.en).sort());
  assert.deepEqual(Object.keys(messages.zh.phases).sort(),Object.keys(messages.en.phases).sort());
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {createBlurredInnerScreen, focusBlurStrength, innerScreenMask} from '../dist/screen-focus.js';
import {paintFoldPixels} from '../dist/phone-renderer.js';

function checkerTexture(width=344,height=240) {
  const data=new Uint8ClampedArray(width*height*4);
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const v=(Math.floor(x/3)+Math.floor(y/3))%2?240:20;
    data.set([v,v,v,255],(y*width+x)*4);
  }
  return {width,height,data};
}

test('focus follows the fold angle continuously and reverses on unfolding',()=>{
  assert.equal(focusBlurStrength(0),0);
  assert.equal(focusBlurStrength(.5),1);
  let previous=0;
  for(let step=0;step<=100;step++){
    const next=focusBlurStrength(step/200);
    assert.ok(next>=previous && next-previous<=.026);previous=next;
  }
  assert.equal(innerScreenMask(172,120,344,240),0);
  assert.equal(innerScreenMask(4,120,344,240),0);
  assert.equal(innerScreenMask(80,100,344,240),1);
});

test('blur softens the left screen without changing the source, right screen, frame or alpha',()=>{
  const source=checkerTexture(), original=source.data.slice(), blurred=createBlurredInnerScreen(source);
  assert.deepEqual(source.data,original);
  for(let y=0;y<240;y++)for(let x=0;x<344;x++){
    const i=(y*344+x)*4;
    assert.equal(blurred.data[i+3],source.data[i+3]);
    if(x<4 || x>=172 || y<4 || y>=236)assert.deepEqual(blurred.data.subarray(i,i+4),source.data.subarray(i,i+4));
  }
  const dark=(100*344+80)*4;
  assert.ok(blurred.data[dark]>70 && blurred.data[dark]<190);
});

test('projected blur affects only the front-facing screen and preserves opaque pixels',()=>{
  const front=checkerTexture(),cover=checkerTexture(172),blurred=createBlurredInnerScreen(front);
  const sharp=new Uint8ClampedArray(408*320*4),soft=sharp.slice();
  paintFoldPixels(sharp,408,320,front,cover,.25);
  paintFoldPixels(soft,408,320,front,cover,.25,blurred);
  assert.notDeepEqual(sharp,soft);
  for(let i=3;i<soft.length;i+=4)assert.equal(soft[i],sharp[i]);
  for(const amount of [0,.55,.75,.95,1]){
    paintFoldPixels(sharp,408,320,front,cover,amount);
    paintFoldPixels(soft,408,320,front,cover,amount,blurred);
    assert.deepEqual(sharp,soft);
  }
});

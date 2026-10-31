import test from 'node:test';
import assert from 'node:assert/strict';
import {projectFoldColumn, paintFoldPixels, foldTranslation, PHONE_HEIGHT, PHONE_WIDTH, RENDER_PADDING} from '../dist/phone-renderer.js';

test('fully open projection maps every source column to its original pixel',()=>{
  for(let x=0;x<=PHONE_WIDTH/2;x++)assert.deepEqual(projectFoldColumn(x,0),{x,height:PHONE_HEIGHT});
});
test('hinge stays fixed at every fold angle',()=>{
  for(let i=0;i<=100;i++)assert.deepEqual(projectFoldColumn(PHONE_WIDTH/2,i/100),{x:PHONE_WIDTH/2,height:PHONE_HEIGHT});
});
test('final unfolding frame converges continuously to the original coordinates',()=>{
  for(let x=0;x<=PHONE_WIDTH/2;x++){
    const p=projectFoldColumn(x,0.000001);
    assert.ok(Math.abs(p.x-x)<.001);
    assert.ok(Math.abs(p.height-PHONE_HEIGHT)<.001);
  }
});
test('closed projection places left half exactly over the right half',()=>{
  for(let x=0;x<=PHONE_WIDTH/2;x++){
    const p=projectFoldColumn(x,1);
    assert.ok(Math.abs(p.x-(PHONE_WIDTH-x))<1e-10);
    assert.ok(Math.abs(p.height-PHONE_HEIGHT)<1e-10);
  }
});

test('inward fold brings the outer edge towards the viewer above the stationary half',()=>{
  for(const amount of [.1,.25,.5,.75,.9]){
    assert.ok(projectFoldColumn(0,amount).height > PHONE_HEIGHT);
    assert.ok(projectFoldColumn(0,amount).height > projectFoldColumn(86,amount).height);
  }
  assert.ok(projectFoldColumn(0,.25).x < PHONE_WIDTH/2);
  assert.ok(projectFoldColumn(0,.75).x > PHONE_WIDTH/2);
});

test('padding contains every projected column throughout the forward and reverse motion',()=>{
  for(let step=0;step<=200;step++)for(let x=0;x<=PHONE_WIDTH/2;x++){
    const amount=step/200, p=projectFoldColumn(x,amount);
    const shiftedX=p.x+foldTranslation(amount);
    assert.ok(shiftedX >= -RENDER_PADDING.x && shiftedX <= PHONE_WIDTH+RENDER_PADDING.x);
    assert.ok(p.height <= PHONE_HEIGHT+2*RENDER_PADDING.y);
  }
});

function solidTexture(width,rgba) {
  const data=new Uint8ClampedArray(width*PHONE_HEIGHT*4);
  for(let i=0;i<data.length;i+=4)data.set(rgba,i);
  return {width,data};
}

test('every projected outer-screen pixel is fully opaque and contains only the outer texture',()=>{
  const front=solidTexture(344,[255,0,255,255]), cover=solidTexture(172,[0,128,255,255]);
  const width=408,height=320,output=new Uint8ClampedArray(width*height*4);
  for(const amount of [.51,.55,.6,.7,.75,.85,.95,.999]) {
    paintFoldPixels(output,width,height,front,cover,amount);
    let painted=0;
    for(let i=0;i<output.length;i+=4)if(output[i+3]){
      assert.deepEqual([...output.subarray(i,i+4)],[0,128,255,255]);painted++;
    }
    assert.ok(painted>0);
    // Interior points may never be transparent, even between former strip edges.
    for(let x=8;x<164;x+=7){
      const p=projectFoldColumn(x,amount);
      const dx=Math.floor(p.x+RENDER_PADDING.x+foldTranslation(amount));
      for(let y=40;y<200;y+=19){
        const dy=Math.floor(RENDER_PADDING.y+120+(y-120)*p.height/240);
        assert.equal(output[(dy*width+dx)*4+3],255);
      }
    }
  }
});

test('front-facing frames use only the inner texture; frame buffers clear old pixels',()=>{
  const front=solidTexture(344,[240,80,40,255]),cover=solidTexture(172,[0,128,255,255]);
  const output=new Uint8ClampedArray(408*320*4);
  paintFoldPixels(output,408,320,front,cover,.75);
  paintFoldPixels(output,408,320,front,cover,.25);
  for(let i=0;i<output.length;i+=4)if(output[i+3])assert.deepEqual([...output.subarray(i,i+4)],[240,80,40,255]);
  assert.equal(output[3],0);
});

test('moving inner display reaches the fixed display with no transparent hinge column',()=>{
  const front=solidTexture(344,[180,200,220,255]),cover=solidTexture(172,[0,128,255,255]);
  const width=408, output=new Uint8ClampedArray(width*320*4);
  for(let step=1;step<=490;step++){
    const amount=step/1000;
    const hinge=RENDER_PADDING.x+PHONE_WIDTH/2+foldTranslation(amount);
    assert.ok(Number.isInteger(hinge));
    paintFoldPixels(output,width,320,front,cover,amount);
    for(let y=6;y<234;y++) {
      const pixel=((y+RENDER_PADDING.y)*width+hinge-1)*4;
      assert.equal(output[pixel+3],255,`transparent hinge at amount=${amount}, row=${y}`);
      assert.equal(output[pixel],180);
    }
  }
});

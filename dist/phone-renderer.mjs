import { createPhoneTextures } from './pixel-art.mjs';
import { createBlurredInnerScreen, focusBlurStrength, innerScreenMask } from './screen-focus.mjs';
import { ScreenClock } from './screen-clock.mjs';

export const PHONE_WIDTH = 344, PHONE_HEIGHT = 240;
export const RENDER_PADDING = Object.freeze({ x:32, y:40 });
const FOCAL_LENGTH = 900;

// Both halves must share an integer output-pixel hinge. A subpixel drawImage
// edge on the fixed half cannot meet the moving half's discrete raster cleanly.
export function foldTranslation(amount) {
  return Math.round(-PHONE_WIDTH/4*amount);
}

export function projectFoldColumn(x, amount) {
  const angle = amount * Math.PI;
  const u = x - PHONE_WIDTH/2;
  // The left edge rises towards the viewer before closing onto the right screen.
  // Positive camera depth makes its near edge larger, rather than receding behind.
  const depth = -u * Math.sin(angle);
  const scale = FOCAL_LENGTH / (FOCAL_LENGTH - depth);
  return { x:PHONE_WIDTH/2 + u*Math.cos(angle)*scale, height:PHONE_HEIGHT*scale };
}

// Inverse-map one source texel to each covered output pixel. Drawing narrow
// strips with drawImage creates partially covered edges that leak the rear
// screen through; this raster has no internal edges or alpha accumulation.
export function paintFoldPixels(output, width, height, front, cover, amount, blurredFront = null) {
  output.fill(0);
  const half=PHONE_WIDTH/2, angle=amount*Math.PI;
  const sine=Math.sin(angle), cosine=Math.cos(angle);
  const offset=RENDER_PADDING.x+foldTranslation(amount);
  const outer=projectFoldColumn(0,amount).x;
  const first=Math.max(0,Math.floor(Math.min(outer,half)+offset));
  const last=Math.min(width,Math.ceil(Math.max(outer,half)+offset));
  const back=amount>.5, texture=back?cover:front;
  const blurStrength = !back && blurredFront ? focusBlurStrength(amount) : 0;
  for(let dx=first;dx<last;dx++) {
    const k=dx+.5-offset-half;
    const denominator=cosine*FOCAL_LENGTH-k*sine;
    if(Math.abs(denominator)<1e-10) continue;
    const u=k*FOCAL_LENGTH/denominator, sourceX=half+u;
    if(sourceX<0 || sourceX>=half) continue;
    const scale=FOCAL_LENGTH/(FOCAL_LENGTH+u*sine);
    const projectedHeight=PHONE_HEIGHT*scale;
    const top=RENDER_PADDING.y+(PHONE_HEIGHT-projectedHeight)/2;
    const yStart=Math.max(0,Math.floor(top));
    const yEnd=Math.min(height,Math.ceil(top+projectedHeight));
    const sx=back?half-1-Math.floor(sourceX):Math.floor(sourceX);
    for(let dy=yStart;dy<yEnd;dy++) {
      const sy=Math.floor((dy+.5-top)/scale);
      if(sy<0 || sy>=PHONE_HEIGHT) continue;
      const source=(sy*texture.width+sx)*4, destination=(dy*width+dx)*4;
      output[destination]=texture.data[source];
      output[destination+1]=texture.data[source+1];
      output[destination+2]=texture.data[source+2];
      output[destination+3]=texture.data[source+3];
      if(blurStrength > 0) {
        const mix=blurStrength*innerScreenMask(sx,sy,PHONE_WIDTH,PHONE_HEIGHT);
        if(mix > 0) for(let channel=0;channel<3;channel++) {
          const sharp=texture.data[source+channel];
          output[destination+channel]=Math.round(sharp+(blurredFront.data[source+channel]-sharp)*mix);
        }
      }
    }
  }
}

// One output bitmap is used for every frame. The final frame uses the same source
// and exact coordinates as the initial frame: no CSS layer or texture swap.
export class PhoneRenderer {
  constructor(canvas, language, theme = 'light') {
    this.canvas = canvas;
    canvas.width = PHONE_WIDTH + RENDER_PADDING.x*2;
    canvas.height = PHONE_HEIGHT + RENDER_PADDING.y*2;
    this.context = canvas.getContext('2d');
    this.context.imageSmoothingEnabled = false;
    this.faceCanvas = document.createElement('canvas');
    this.faceCanvas.width = canvas.width;
    this.faceCanvas.height = canvas.height;
    this.faceContext = this.faceCanvas.getContext('2d');
    this.facePixels = this.faceContext.createImageData(canvas.width,canvas.height);
    this.amount = 0;
    this.target = 0;
    this.frame = 0;
    this.finished = Promise.resolve();
    this.screenClock = new ScreenClock();
    this.theme = theme === 'dark' ? 'dark' : 'light';
    this.setLanguage(language);
  }

  setLanguage(language) {
    this.language = language;
    this.updateClock(new Date());
  }

  setTheme(theme) {
    this.theme = theme === 'dark' ? 'dark' : 'light';
    this.updateClock();
  }

  updateClock(date = new Date()) {
    const clock = this.screenClock.read(this.language,date);
    const textureKey = `${clock.key}:${this.theme}`;
    if(textureKey === this.textureKey) return false;
    this.textures = createPhoneTextures(this.language,clock,this.theme);
    this.frontPixels = this.textures.front.getContext('2d').getImageData(0,0,PHONE_WIDTH,PHONE_HEIGHT);
    this.blurredFrontPixels = createBlurredInnerScreen(this.frontPixels);
    this.coverPixels = this.textures.cover.getContext('2d').getImageData(0,0,PHONE_WIDTH/2,PHONE_HEIGHT);
    this.clockDisplay = clock;
    this.textureKey = textureKey;
    this.canvas.setAttribute('data-screen-theme',this.theme);
    this.canvas.setAttribute('data-screen-time',clock.time);
    this.canvas.setAttribute('data-screen-date',clock.date);
    this.draw();
    return true;
  }

  pauseClock() {
    this.screenClock.pause();
    this.updateClock();
  }

  draw() {
    const c = this.context, half = PHONE_WIDTH/2;
    c.clearRect(0,0,this.canvas.width,this.canvas.height);
    c.save();
    c.translate(RENDER_PADDING.x,RENDER_PADDING.y);
    if(this.amount === 0) {
      c.drawImage(this.textures.front,0,0);
      c.restore();
      return;
    }
    c.translate(foldTranslation(this.amount),0);
    c.drawImage(this.textures.front,half,0,half,PHONE_HEIGHT,half,0,half,PHONE_HEIGHT);
    if(this.amount === 1) {
      c.drawImage(this.textures.cover,half,0);
    }
    c.restore();
    if(this.amount > 0 && this.amount < 1) {
      paintFoldPixels(this.facePixels.data,this.canvas.width,this.canvas.height,
        this.frontPixels,this.coverPixels,this.amount,this.blurredFrontPixels);
      this.faceContext.putImageData(this.facePixels,0,0);
      c.drawImage(this.faceCanvas,0,0);
    }
  }

  moveTo(target, duration) {
    if(target === this.target && this.frame) return this.finished;
    if(target === this.amount && !this.frame) return this.finished;
    this.cancel();
    this.target=target;
    if(duration === 0) {
      this.amount=target; this.draw();
      this.finished=Promise.resolve(); return this.finished;
    }
    const start=this.amount, started=performance.now();
    this.finished=new Promise(resolve => {
      this.resolve=resolve;
      const tick=now => {
        const t=Math.min(1,(now-started)/duration);
        const eased=t*t*(3-2*t);
        this.amount=start+(target-start)*eased;
        if(t === 1) this.amount=target;
        this.draw();
        if(t < 1) this.frame=requestAnimationFrame(tick);
        else { this.frame=0;this.resolve=undefined;resolve(); }
      };
      this.frame=requestAnimationFrame(tick);
    });
    return this.finished;
  }

  cancel() {
    if(this.frame) cancelAnimationFrame(this.frame);
    this.frame=0;
    this.resolve?.();
    this.resolve=undefined;
  }

  reset() {
    this.cancel(); this.amount=0;this.target=0;
    this.finished=Promise.resolve();this.screenClock.resume();
    if(!this.updateClock()) this.draw();
  }
}

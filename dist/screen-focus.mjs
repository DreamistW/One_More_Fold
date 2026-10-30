// Blur only RGB in the source screen texture, never the projected silhouette or
// its alpha channel. This preserves opaque occlusion and the shared pixel hinge.
const SIGMA = 8;
const RADIUS = Math.ceil(SIGMA * 3);
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export function focusBlurStrength(foldAmount) {
  // Reach full blur while the inner screen is still broadly visible, and keep
  // it soft until the final portion of unfolding instead of clearing too early.
  const t = clamp(foldAmount / .3, 0, 1);
  return t * t * (3 - 2 * t);
}

export function innerScreenMask(x, y, width, height) {
  // Feather into the sharp hinge and frame instead of producing a hard divider.
  return clamp(Math.min((x - 4) / 6, (width / 2 - x) / 8,
    (y - 4) / 6, (height - 4 - y) / 6), 0, 1);
}

export function createBlurredInnerScreen(source) {
  const {width, data} = source;
  const height = data.length / (width * 4);
  const result = {width, height, data:new Uint8ClampedArray(data)};
  const horizontal = new Float32Array(data.length);
  const kernel = Array.from({length:RADIUS * 2 + 1}, (_, i) => Math.exp(-((i-RADIUS)**2) / (2*SIGMA*SIGMA)));
  const sum = kernel.reduce((a,b) => a+b, 0);
  for(let i=0;i<kernel.length;i++) kernel[i] /= sum;
  for(let y=4;y<height-4;y++) for(let x=4;x<width/2;x++) {
    const destination = (y*width+x)*4;
    for(let k=-RADIUS;k<=RADIUS;k++) {
      const offset = (y*width+clamp(x+k,4,width-5))*4;
      const weight = kernel[k+RADIUS];
      for(let channel=0;channel<3;channel++) horizontal[destination+channel] += data[offset+channel]*weight;
    }
  }
  for(let y=4;y<height-4;y++) for(let x=4;x<width/2;x++) {
    const destination = (y*width+x)*4;
    for(let channel=0;channel<3;channel++) {
      let value=0;
      for(let k=-RADIUS;k<=RADIUS;k++) value += horizontal[(clamp(y+k,4,height-5)*width+x)*4+channel]*kernel[k+RADIUS];
      result.data[destination+channel] = Math.round(value);
    }
  }
  return result;
}

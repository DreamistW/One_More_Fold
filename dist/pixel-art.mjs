// All scenery is drawn at native low resolution. CSS scales with nearest neighbours.
const W = 336, H = 232;
const digitMap = {
  '0':['111','101','101','101','111'], '1':['010','110','010','010','111'],
  '4':['101','101','111','001','001'], '9':['111','101','111','001','111'],
  ':':['0','1','0','1','0']
};

function pixelText(ctx, text, center, top, scale, color) {
  const widths = [...text].map(char => digitMap[char][0].length * scale);
  let x = Math.floor(center - (widths.reduce((a,b) => a+b,0) + (text.length-1)*scale) / 2);
  ctx.fillStyle = color;
  [...text].forEach((char, index) => {
    digitMap[char].forEach((row, y) => [...row].forEach((pixel, col) => {
      if (pixel === '1') ctx.fillRect(x + col*scale, top + y*scale, scale, scale);
    }));
    x += widths[index] + scale;
  });
}

function random(seed = 42) {
  return () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
}

function scenery(width, cover = false, language = 'zh') {
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = H;
  const c = canvas.getContext('2d');
  const rand = random(cover ? 57 : 42);
  const palette = ['#a4bac1','#aec2c5','#bccacc','#c9cfc9','#d4d4c8','#ded8c6','#e4dbc5','#e8ddc4'];
  palette.forEach((color,i) => { c.fillStyle=color; c.fillRect(0,i*17,width,18); });
  // Sparse dithering softens sky bands without blurring pixel edges.
  for(let i=0;i<480;i++) {
    const x=Math.floor(rand()*width), y=Math.floor(rand()*119);
    c.fillStyle=palette[Math.min(7,Math.floor(y/17)+(rand()>.5?1:0))]; c.fillRect(x,y,1,1);
  }
  const mountain = (base, height, color, seedOffset) => {
    c.fillStyle=color; c.beginPath(); c.moveTo(0,H);
    for(let x=0;x<=width+3;x+=3) {
      const wave=Math.sin(x*.029+seedOffset)*height*.38+Math.sin(x*.085+seedOffset)*height*.25;
      const y=Math.round(base + wave + rand()*height*.25);
      c.lineTo(x,y); c.lineTo(x+3,y);
    }
    c.lineTo(width,H); c.closePath(); c.fill();
  };
  mountain(117,21,'#b3ab95',1); mountain(128,24,'#928e7c',3); mountain(139,29,'#757768',6); mountain(153,27,'#585f54',1);
  // Dark angular rock fragments.
  for(let i=0;i<240;i++) {
    const x=Math.floor(rand()*width), y=137+Math.floor(rand()*49);
    c.fillStyle=rand()>.5?'#99927b66':'#404d4366'; c.fillRect(x,y,1+Math.floor(rand()*4),1+Math.floor(rand()*3));
  }
  const duneY = x => Math.round(151 + 28*Math.sin((x/width)*Math.PI) - 5*x/width);
  for(let x=0;x<width;x++) {
    const y=duneY(x); c.fillStyle='#cdbb95'; c.fillRect(x,y,1,H-y);
    c.fillStyle='#e1d0aa'; c.fillRect(x,y,1,3);
  }
  for(let y=154;y<H;y+=3) {
    c.fillStyle=y>205?'#9e8f6d':'#b5a27d';
    for(let x=0;x<width;x+=2) {
      const lineY=y+Math.round(7*Math.sin(x/width*5+y*.013));
      if(lineY>duneY(x)+5 && (x+y)%7!==0) c.fillRect(x,lineY,1,1);
    }
  }
  c.fillStyle='#f4f5e6'; c.font='7px sans-serif'; c.textAlign='center'; c.fillText(language === 'zh' ? '4月1日 周三' : 'WED, APR 01',width/2,21);
  pixelText(c, cover?'9:41':'09:41',width/2,31,cover?5:6,'#f7fae9');
  // Pixel signal and battery glyphs.
  c.fillStyle='#edf5e7'; c.fillRect(width-19,12,9,1); c.fillRect(width-17,14,5,1); c.fillRect(width-15,16,1,1);
  c.fillStyle='#eee9d1'; c.fillRect(width/2-25,H-9,50,2);
  for(let i=0;i<2;i++) {
    const x=width-17, y=H-47+i*19;
    c.fillStyle='#eee6ce55'; c.fillRect(x-7,y-7,14,14);c.fillStyle='#fff8e4';
    if(i===0){c.fillRect(x-2,y-4,4,3);c.fillRect(x-1,y-1,2,5);} else {c.fillRect(x-4,y-2,8,5);c.fillRect(x-2,y-4,3,2);c.fillStyle='#b9ad90';c.fillRect(x-1,y-1,2,2);}
  }
  return canvas;
}

export function createPhoneTextures(language = 'zh') {
  const wallpaper = scenery(W, false, language);
  const makePhone = (width, image, cover) => {
    const canvas = document.createElement('canvas');
    canvas.width = width; canvas.height = 240;
    const c = canvas.getContext('2d');
    c.imageSmoothingEnabled = false;
    for (const [inset,radius,color] of [[0,12,'#242825'],[1,11,'#737b70'],[2,10,'#30362f']]) {
      c.fillStyle = color; c.beginPath();
      c.roundRect(inset,inset,width-inset*2,240-inset*2,cover?[1,radius,radius,1]:radius); c.fill();
    }
    c.save(); c.beginPath(); c.roundRect(4,4,width-8,232,cover?[0,8,8,0]:8); c.clip();
    c.drawImage(image,0,0,image.width,image.height,4,4,width-8,232); c.restore();
    if(cover) { c.fillStyle='#131c21';c.fillRect(width-22,15,9,9);c.fillStyle='#213040';c.fillRect(width-19,18,3,3); }
    return canvas;
  };
  return { front:makePhone(344,wallpaper,false), cover:makePhone(172,scenery(168,true,language),true) };
}

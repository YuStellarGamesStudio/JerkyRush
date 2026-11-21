import type { ItemKind } from './game/spawner';

/** 全部角色與物品皆以 Canvas 2D 程式繪製，不使用外部素材（R9）。 */

interface CatPalette {
  /** 毛色：主色、亮部（受光的頭頂）、暗部（臉頰邊緣與下巴）。 */
  fur: string;
  furLight: string;
  furDark: string;
  /** 輪廓光；讓深色貓在深色背景上仍看得清楚。 */
  rim: string;
  earInner: string;
  /** 虹膜由瞳孔往外的兩個顏色。 */
  iris: readonly [string, string];
  /** 鼻口周圍（鬍鬚墊）的毛色。 */
  muzzle: string;
  nose: string;
  whisker: string;
  /** 虎斑紋；沒有就是純色貓。 */
  stripes?: string;
}

export const catPalettes = {
  black: {
    fur: '#1c1d23', furLight: '#454b59', furDark: '#08090b', rim: '#7d93a1',
    earInner: '#5b3c45', iris: ['#ffe08a', '#c47f12'], muzzle: '#2a2c34', nose: '#3b2b30', whisker: '#e6e9ee',
  },
  gray: {
    fur: '#8b929b', furLight: '#c9cfd5', furDark: '#565c65', rim: '#e3e8ec',
    earInner: '#d99aa1', iris: ['#d4f59a', '#4f9a33'], muzzle: '#d3d8dc', nose: '#c4747e', whisker: '#f7f9fa',
    stripes: '#4f555d',
  },
  orange: {
    fur: '#e48d37', furLight: '#ffc581', furDark: '#a9561a', rim: '#fff0da',
    earInner: '#f0a39d', iris: ['#e0f59a', '#5a982d'], muzzle: '#fbe3c6', nose: '#e07c85', whisker: '#fffaf2',
    stripes: '#a95213',
  },
} satisfies Record<string, CatPalette>;

/** 固定種子的亂數，讓毛流筆觸每次重畫都一樣。 */
function seededRandom(seed: number): () => number {
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

export function drawArena(ctx: CanvasRenderingContext2D, width: number, height: number, groundHeight: number): void {
  ctx.fillStyle = '#163838';
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = '#204746';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = 40; x < width; x += 40) {
    ctx.moveTo(x + 0.5, 0);
    ctx.lineTo(x + 0.5, height);
  }
  for (let y = 45; y < height; y += 45) {
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(width, y + 0.5);
  }
  ctx.stroke();
  ctx.strokeStyle = '#39736c';
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, width - 2, height - 2);
  ctx.strokeRect(9, 9, width - 18, height - 18);
  // 地面：貓站在這條帶子上接掉下來的東西。
  const groundTop = height - groundHeight - 2;
  ctx.fillStyle = '#2c5650';
  ctx.fillRect(2, groundTop, width - 4, height - groundTop - 2);
  ctx.fillStyle = '#4f8f84';
  ctx.fillRect(2, groundTop, width - 4, 2);
}

/** 單位座標（0–1）的貓頭外形：圓頰、略尖的耳朵、柔和的下巴。 */
function headPath(ctx: CanvasRenderingContext2D): void {
  ctx.beginPath();
  ctx.moveTo(0.17, 0.48);
  ctx.lineTo(0.13, 0.13);
  ctx.quadraticCurveTo(0.135, 0.06, 0.2, 0.09);
  ctx.lineTo(0.4, 0.26);
  ctx.quadraticCurveTo(0.5, 0.225, 0.6, 0.26);
  ctx.lineTo(0.8, 0.09);
  ctx.quadraticCurveTo(0.865, 0.06, 0.87, 0.13);
  ctx.lineTo(0.83, 0.48);
  ctx.bezierCurveTo(0.98, 0.64, 0.88, 0.93, 0.5, 0.95);
  ctx.bezierCurveTo(0.12, 0.93, 0.02, 0.64, 0.17, 0.48);
  ctx.closePath();
}

function drawEye(ctx: CanvasRenderingContext2D, x: number, y: number, tilt: number, palette: CatPalette): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(tilt);
  // 眼眶的深色描邊，再畫有漸層的虹膜。
  ctx.fillStyle = '#060608';
  ctx.beginPath();
  ctx.ellipse(0, 0, 0.1, 0.075, 0, 0, Math.PI * 2);
  ctx.fill();
  const iris = ctx.createRadialGradient(0, 0.01, 0.005, 0, 0, 0.085);
  iris.addColorStop(0, palette.iris[0]);
  iris.addColorStop(1, palette.iris[1]);
  ctx.fillStyle = iris;
  ctx.beginPath();
  ctx.ellipse(0, 0, 0.085, 0.062, 0, 0, Math.PI * 2);
  ctx.fill();
  // 上眼瞼的陰影。
  const lid = ctx.createLinearGradient(0, -0.062, 0, 0.02);
  lid.addColorStop(0, '#00000080');
  lid.addColorStop(1, '#00000000');
  ctx.fillStyle = lid;
  ctx.fill();
  // 直立的縫狀瞳孔與反光。
  ctx.fillStyle = '#050505';
  ctx.beginPath();
  ctx.ellipse(0, 0.002, 0.022, 0.058, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffffffe6';
  ctx.beginPath();
  ctx.arc(-0.03, -0.024, 0.017, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff80';
  ctx.beginPath();
  ctx.arc(0.035, 0.022, 0.008, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** 正面的貓頭（光影、毛流、杏仁眼、鬍鬚）；畫在 size×size 的方格中。 */
export function drawCat(ctx: CanvasRenderingContext2D, size: number, palette: CatPalette): void {
  ctx.save();
  ctx.scale(size, size);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // 底色：頭頂受光、邊緣與下巴較暗，做出立體感。
  headPath(ctx);
  const shade = ctx.createRadialGradient(0.45, 0.38, 0.04, 0.5, 0.6, 0.62);
  shade.addColorStop(0, palette.furLight);
  shade.addColorStop(0.45, palette.fur);
  shade.addColorStop(1, palette.furDark);
  ctx.fillStyle = shade;
  ctx.fill();

  ctx.save();
  ctx.clip();

  // 內耳：由耳尖往耳根淡出的粉色，加上耳毛。
  for (const side of [-1, 1]) {
    const ear = ctx.createLinearGradient(0.5 + side * 0.32, 0.14, 0.5 + side * 0.24, 0.36);
    ear.addColorStop(0, `${palette.earInner}dd`);
    ear.addColorStop(1, `${palette.earInner}00`);
    ctx.fillStyle = ear;
    ctx.beginPath();
    ctx.moveTo(0.5 + side * 0.325, 0.135);
    ctx.quadraticCurveTo(0.5 + side * 0.26, 0.2, 0.5 + side * 0.17, 0.295);
    ctx.lineTo(0.5 + side * 0.3, 0.4);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = `${palette.furLight}aa`;
    ctx.lineWidth = 0.008;
    ctx.beginPath();
    for (let i = 0; i < 4; i++) {
      const baseX = 0.5 + side * (0.22 + i * 0.025);
      ctx.moveTo(baseX, 0.33);
      ctx.lineTo(baseX + side * 0.015, 0.24 - i * 0.012);
    }
    ctx.stroke();
  }

  // 毛流：從臉中心往外放射的短筆觸，亮暗交錯。
  const random = seededRandom(palette.fur.length * 977 + palette.fur.charCodeAt(1));
  ctx.lineWidth = 0.009;
  for (let i = 0; i < 220; i++) {
    const x = 0.08 + random() * 0.84;
    const y = 0.1 + random() * 0.86;
    const angle = Math.atan2(y - 0.62, x - 0.5) + (random() - 0.5) * 0.6;
    const length = 0.025 + random() * 0.035;
    ctx.strokeStyle = random() < 0.5 ? `${palette.furLight}55` : `${palette.furDark}66`;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(angle) * length, y + Math.sin(angle) * length);
    ctx.stroke();
  }

  // 虎斑：額頭的 M 字紋與臉頰的橫紋。
  if (palette.stripes) {
    ctx.strokeStyle = palette.stripes;
    ctx.lineWidth = 0.028;
    ctx.beginPath();
    for (const x of [0.43, 0.5, 0.57]) {
      ctx.moveTo(x, 0.29);
      ctx.quadraticCurveTo(x + (x - 0.5) * 0.4, 0.37, x + (x - 0.5) * 0.2, 0.43);
    }
    for (const side of [-1, 1]) {
      for (const y of [0.6, 0.68]) {
        ctx.moveTo(0.5 + side * 0.44, y);
        ctx.quadraticCurveTo(0.5 + side * 0.36, y - 0.02, 0.5 + side * 0.3, y + 0.01);
      }
    }
    ctx.stroke();
  }

  // 鼻口：較淺的鬍鬚墊與下巴。
  ctx.fillStyle = palette.muzzle;
  ctx.globalAlpha = 0.9;
  for (const [x, y, rx, ry, tilt] of [[0.44, 0.735, 0.085, 0.065, 0.2], [0.56, 0.735, 0.085, 0.065, -0.2], [0.5, 0.82, 0.07, 0.05, 0]] as const) {
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, tilt, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.fillStyle = `${palette.furDark}99`;
  for (const [x, y] of [[0.41, 0.72], [0.385, 0.75], [0.42, 0.765], [0.59, 0.72], [0.615, 0.75], [0.58, 0.765]] as const) {
    ctx.beginPath();
    ctx.arc(x, y, 0.007, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // 臉頰與下巴邊緣的細毛，從輪廓內往外刷出，讓邊緣不像貼紙那麼平滑。
  ctx.lineWidth = 0.008;
  for (let i = 0; i < 60; i++) {
    // 下半臉的輪廓約為以 (0.5, 0.64) 為中心、半徑 (0.40, 0.31) 的橢圓。
    const angle = Math.PI * (0.1 + random() * 0.8);
    const from = 0.85;
    const to = 1 + random() * 0.08;
    const dx = Math.cos(angle) * 0.4;
    const dy = Math.sin(angle) * 0.31;
    ctx.strokeStyle = random() < 0.6 ? palette.fur : `${palette.furLight}99`;
    ctx.beginPath();
    ctx.moveTo(0.5 + dx * from, 0.64 + dy * from);
    ctx.lineTo(0.5 + dx * to + (random() - 0.5) * 0.015, 0.64 + dy * to);
    ctx.stroke();
  }

  // 細微的輪廓光：深色貓在深色背景上也看得出頭形。
  headPath(ctx);
  ctx.strokeStyle = `${palette.rim}66`;
  ctx.lineWidth = 0.012;
  ctx.stroke();

  drawEye(ctx, 0.335, 0.535, -0.18, palette);
  drawEye(ctx, 0.665, 0.535, 0.18, palette);

  // 鼻子與嘴。
  const nose = ctx.createLinearGradient(0, 0.64, 0, 0.7);
  nose.addColorStop(0, palette.nose);
  nose.addColorStop(1, `${palette.nose}cc`);
  ctx.fillStyle = nose;
  ctx.beginPath();
  ctx.moveTo(0.455, 0.65);
  ctx.quadraticCurveTo(0.5, 0.63, 0.545, 0.65);
  ctx.quadraticCurveTo(0.53, 0.68, 0.5, 0.7);
  ctx.quadraticCurveTo(0.47, 0.68, 0.455, 0.65);
  ctx.fill();
  ctx.fillStyle = '#ffffff55';
  ctx.beginPath();
  ctx.ellipse(0.49, 0.651, 0.017, 0.007, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#140d0fcc';
  ctx.lineWidth = 0.011;
  ctx.beginPath();
  ctx.moveTo(0.5, 0.7);
  ctx.lineTo(0.5, 0.735);
  ctx.quadraticCurveTo(0.47, 0.775, 0.44, 0.755);
  ctx.moveTo(0.5, 0.735);
  ctx.quadraticCurveTo(0.53, 0.775, 0.56, 0.755);
  ctx.stroke();

  // 鬍鬚：從鬍鬚墊微微彎曲地往外伸。
  ctx.strokeStyle = `${palette.whisker}d9`;
  for (const side of [-1, 1]) {
    for (const [startY, endY, bend] of [[0.725, 0.66, -0.02], [0.745, 0.74, 0], [0.765, 0.82, 0.02]] as const) {
      ctx.lineWidth = 0.007;
      ctx.beginPath();
      ctx.moveTo(0.5 + side * 0.11, startY);
      ctx.quadraticCurveTo(0.5 + side * 0.3, (startY + endY) / 2 + bend, 0.5 + side * 0.49, endY);
      ctx.stroke();
    }
  }
  ctx.restore();
}

export type OrangeSide = 'left' | 'right';

/**
 * 橘貓彩蛋：大一點的橘貓加上叫聲對話框；畫在 width×height 中。
 * side 是橘貓探出的那一側邊緣：貓靠該側，對話框朝畫面內。
 */
export function drawOrangeCat(
  ctx: CanvasRenderingContext2D, width: number, height: number, meow: string, side: OrangeSide,
): void {
  const catSize = height * 0.8;
  ctx.save();
  ctx.translate(side === 'left' ? 0 : width - catSize, height - catSize);
  drawCat(ctx, catSize, catPalettes.orange);
  ctx.restore();

  const bubbleW = width - catSize * 0.78 - 2;
  const bubbleX = side === 'left' ? catSize * 0.78 : 2;
  const bubbleH = height * 0.32;
  // 對話框的尾巴指向貓。
  const tailBase = side === 'left' ? bubbleX + 10 : bubbleX + bubbleW - 10;
  const tailTip = side === 'left' ? bubbleX - 6 : bubbleX + bubbleW + 6;
  const tailEnd = side === 'left' ? bubbleX + 24 : bubbleX + bubbleW - 24;
  ctx.fillStyle = '#fff8ea';
  ctx.strokeStyle = '#c96a17';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(bubbleX, 2, bubbleW, bubbleH, 10);
  ctx.moveTo(tailBase, bubbleH - 2);
  ctx.lineTo(tailTip, bubbleH + 14);
  ctx.lineTo(tailEnd, bubbleH + 1);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#7a3a06';
  // 字串依語言長短不同，太長時縮小字級以放進對話框。
  let fontSize = Math.round(bubbleH * 0.55);
  ctx.font = `700 ${fontSize}px system-ui, sans-serif`;
  const textWidth = ctx.measureText(meow).width;
  if (textWidth > bubbleW - 12) {
    fontSize = Math.floor(fontSize * (bubbleW - 12) / textWidth);
    ctx.font = `700 ${fontSize}px system-ui, sans-serif`;
  }
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(meow, bubbleX + bubbleW / 2, 2 + bubbleH / 2);
}

function drawJerky(ctx: CanvasRenderingContext2D, fill: string, outline: string, stripes: number): void {
  ctx.fillStyle = fill;
  ctx.strokeStyle = outline;
  ctx.lineWidth = 0.06;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.ellipse(0.42, 0.5, 0.3, 0.17, 0, 0, Math.PI * 2);
  ctx.moveTo(0.68, 0.5);
  ctx.lineTo(0.92, 0.32);
  ctx.lineTo(0.88, 0.5);
  ctx.lineTo(0.92, 0.68);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  for (let i = 0; i < stripes; i++) {
    const x = 0.34 + i * 0.1;
    ctx.moveTo(x, 0.4);
    ctx.lineTo(x - 0.04, 0.6);
  }
  ctx.stroke();
  ctx.fillStyle = outline;
  ctx.beginPath();
  ctx.arc(0.22, 0.46, 0.035, 0, Math.PI * 2);
  ctx.fill();
}

/** 物品圖示；畫在 size×size 的方格中，碰撞半徑約為 size 的 0.4 倍。 */
export function drawItem(ctx: CanvasRenderingContext2D, size: number, kind: ItemKind): void {
  ctx.save();
  ctx.scale(size, size);
  switch (kind) {
    case 'small':
      drawJerky(ctx, '#c98b4f', '#5e3519', 2);
      break;
    case 'orange-small':
      ctx.fillStyle = '#ffd27a55';
      ctx.beginPath();
      ctx.arc(0.5, 0.5, 0.48, 0, Math.PI * 2);
      ctx.fill();
      drawJerky(ctx, '#ff9a2e', '#8a3a00', 2);
      break;
    case 'big':
      ctx.translate(0.5, 0.5);
      ctx.scale(1.15, 1.35);
      ctx.translate(-0.5, -0.5);
      drawJerky(ctx, '#9c5a2c', '#3d200c', 3);
      break;
    case 'can':
      ctx.fillStyle = '#b8c4cc';
      ctx.strokeStyle = '#4f5d66';
      ctx.lineWidth = 0.05;
      ctx.beginPath();
      ctx.roundRect(0.14, 0.12, 0.72, 0.76, 0.12);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#3c78b4';
      ctx.fillRect(0.16, 0.34, 0.68, 0.32);
      ctx.fillStyle = '#f5f8fb';
      ctx.beginPath();
      ctx.ellipse(0.46, 0.5, 0.15, 0.08, 0, 0, Math.PI * 2);
      ctx.moveTo(0.6, 0.5);
      ctx.lineTo(0.72, 0.41);
      ctx.lineTo(0.72, 0.59);
      ctx.fill();
      break;
    case 'chili':
      ctx.fillStyle = '#d8343a';
      ctx.strokeStyle = '#7a1218';
      ctx.lineWidth = 0.05;
      ctx.beginPath();
      ctx.moveTo(0.3, 0.26);
      ctx.bezierCurveTo(0.1, 0.5, 0.36, 0.92, 0.82, 0.86);
      ctx.bezierCurveTo(0.56, 0.7, 0.52, 0.4, 0.48, 0.24);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = '#4f9a3a';
      ctx.lineWidth = 0.09;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(0.38, 0.24);
      ctx.quadraticCurveTo(0.4, 0.08, 0.56, 0.1);
      ctx.stroke();
      break;
  }
  ctx.restore();
}

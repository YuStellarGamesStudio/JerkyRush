import type { ItemKind } from './game/spawner';

/** 全部角色與物品皆以 Canvas 2D 程式繪製，不使用外部素材（R9）。 */

interface CatPalette {
  fur: string;
  outline: string;
  eye: string;
  stripes?: string;
}

export const catPalettes = {
  black: { fur: '#0b1625', outline: '#85c7b8', eye: '#e6b983' },
  gray: { fur: '#8d97a4', outline: '#e8eef2', eye: '#7fd36b', stripes: '#69737f' },
  orange: { fur: '#f29a38', outline: '#fff1d6', eye: '#3c8f4f', stripes: '#c96a17' },
} satisfies Record<string, CatPalette>;

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

/** 俯視貓頭；畫在 size×size 的方格中。 */
export function drawCat(ctx: CanvasRenderingContext2D, size: number, palette: CatPalette): void {
  ctx.save();
  ctx.scale(size / 48, size / 48);
  ctx.fillStyle = palette.fur;
  ctx.strokeStyle = palette.outline;
  ctx.lineWidth = 2;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(6, 22);
  ctx.lineTo(7, 7);
  ctx.lineTo(18, 13);
  ctx.quadraticCurveTo(24, 11, 30, 13);
  ctx.lineTo(41, 7);
  ctx.lineTo(42, 22);
  ctx.bezierCurveTo(52, 49, -4, 49, 6, 22);
  ctx.closePath();
  ctx.fill();

  if (palette.stripes) {
    ctx.save();
    ctx.clip();
    ctx.strokeStyle = palette.stripes;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    for (const x of [19, 24, 29]) {
      ctx.moveTo(x, 12);
      ctx.lineTo(x, 19);
    }
    ctx.moveTo(4, 30);
    ctx.lineTo(10, 31);
    ctx.moveTo(44, 30);
    ctx.lineTo(38, 31);
    ctx.stroke();
    ctx.restore();
  }
  ctx.stroke();

  ctx.fillStyle = palette.eye;
  ctx.fillRect(13, 24, 5, 6);
  ctx.fillRect(30, 24, 5, 6);
  ctx.fillStyle = '#f3a798';
  ctx.beginPath();
  ctx.moveTo(21, 31);
  ctx.lineTo(27, 31);
  ctx.lineTo(24, 34);
  ctx.fill();
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

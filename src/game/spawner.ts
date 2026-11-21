import { config } from '../config';
import type { Position } from './cats';

export type FoodKind = 'small' | 'orange-small' | 'big' | 'can';
export type ItemKind = FoodKind | 'chili';

export interface Item {
  readonly id: number;
  readonly kind: ItemKind;
  /** 每帧依 vy 往下移動。 */
  readonly pos: Position;
  /** 落下速度（像素／秒）。 */
  readonly vy: number;
  readonly spawnTime: number;
}

/** 回傳 [0, 1) 的亂數；測試可注入固定序列。 */
export type Random = () => number;

export function difficultyAt(elapsed: number): { interval: number; chiliRatio: number; fallSpeed: number } {
  const progress = Math.min(1, Math.max(0, elapsed / config.roundSeconds));
  const lerp = (range: { start: number; end: number }) => range.start + (range.end - range.start) * progress;
  const { spawnInterval, chiliRatio, fallSpeed } = config.difficulty;
  return { interval: lerp(spawnInterval), chiliRatio: lerp(chiliRatio), fallSpeed: lerp(fallSpeed) };
}

export function chooseKind(random: Random, chiliRatio: number): ItemKind {
  if (random() < chiliRatio) return 'chili';

  const { foodWeights, orangeRatio } = config.items;
  const total = foodWeights.small + foodWeights.big + foodWeights.can;
  const roll = random() * total;
  if (roll < foodWeights.can) return 'can';
  if (roll < foodWeights.can + foodWeights.big) return 'big';
  return random() < orangeRatio ? 'orange-small' : 'small';
}

/** 物品從畫面上緣外、隨機的水平位置開始掉落。 */
export function spawnPosition(random: Random, kind: ItemKind): Position {
  const { width } = config.arena;
  const margin = config.items.spawnMargin;
  return { x: margin + random() * (width - margin * 2), y: -config.items.radius[kind] };
}

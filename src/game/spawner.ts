import { config } from '../config';
import type { Position } from './cats';

export type FoodKind = 'small' | 'orange-small' | 'big' | 'can';
export type ItemKind = FoodKind | 'chili';

export interface Item {
  readonly id: number;
  readonly kind: ItemKind;
  readonly pos: Position;
  readonly spawnTime: number;
  readonly ttl: number;
}

/** 回傳 [0, 1) 的亂數；測試可注入固定序列。 */
export type Random = () => number;

export function difficultyAt(elapsed: number): { interval: number; chiliRatio: number } {
  const progress = Math.min(1, Math.max(0, elapsed / config.roundSeconds));
  const { spawnInterval, chiliRatio } = config.difficulty;
  return {
    interval: spawnInterval.start + (spawnInterval.end - spawnInterval.start) * progress,
    chiliRatio: chiliRatio.start + (chiliRatio.end - chiliRatio.start) * progress,
  };
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

/** 隨機找遠離貓的生成點；多次嘗試仍找不到時回傳 undefined，該次生成略過。 */
export function spawnPosition(random: Random, avoid: readonly Position[]): Position | undefined {
  const { width, height } = config.arena;
  const { spawnMargin: margin, spawnClearance } = config.items;
  for (let attempt = 0; attempt < 12; attempt++) {
    const pos = {
      x: margin + random() * (width - margin * 2),
      y: margin + random() * (height - margin * 2),
    };
    if (avoid.every((other) => Math.hypot(other.x - pos.x, other.y - pos.y) >= spawnClearance)) return pos;
  }
  return undefined;
}

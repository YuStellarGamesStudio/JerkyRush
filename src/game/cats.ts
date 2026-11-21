import { config } from '../config';
import type { Item } from './spawner';

export interface Position {
  x: number;
  y: number;
}

export interface Cat {
  readonly kind: 'black' | 'gray';
  readonly pos: Position;
  readonly radius: number;
  /** 回合已用秒數小於此值時，碰到辣椒不扣命。 */
  invulnUntil: number;
}

/** 貓站立的高度（貓中心的 y）。 */
export const groundY = (): number => config.arena.height - config.groundOffset;

function clampX(x: number, radius: number): number {
  return Math.max(radius, Math.min(config.arena.width - radius, x));
}

export function overlaps(cat: Pick<Cat, 'pos' | 'radius'>, item: Item): boolean {
  return Math.hypot(cat.pos.x - item.pos.x, cat.pos.y - item.pos.y) < cat.radius + config.items.radius[item.kind];
}

/** 黑貓沿地面左右移動；inputX 為 −1、0、1。 */
export function moveBlackCat(cat: Cat, inputX: number, dt: number): void {
  cat.pos.x = clampX(cat.pos.x + Math.sign(inputX) * config.blackCat.speed * dt, cat.radius);
}

interface Zone {
  left: number;
  right: number;
}

/**
 * 灰貓 AI：在地面左右移動，接「最快落地且來得及接到」的小魚干（含橘色）；
 * 不走到快落地的辣椒下方，已在下方就往較近的一側閃開；路線被辣椒擋住時改接可安全抵達的小魚干。
 */
export class GrayCatAI {
  targetId: number | undefined;

  reset(): void {
    this.targetId = undefined;
  }

  /** 即將落到貓高度的辣椒所遮住的水平範圍。 */
  dangerZones(cat: Cat, items: readonly Item[]): Zone[] {
    const { dangerSeconds, avoidMargin } = config.grayCat;
    const zones: Zone[] = [];
    for (const item of items) {
      if (item.kind !== 'chili') continue;
      const reach = cat.radius + config.items.radius.chili;
      const above = cat.pos.y - item.pos.y;
      if (above > reach + item.vy * dangerSeconds || above < -reach) continue;
      const half = reach + avoidMargin;
      zones.push({ left: item.pos.x - half, right: item.pos.x + half });
    }
    return zones;
  }

  selectTarget(cat: Cat, items: readonly Item[]): Item | undefined {
    const speed = config.blackCat.speed * config.grayCat.speedRatio;
    const zones = this.dangerZones(cat, items);
    let best: Item | undefined;
    let bestTime = Infinity;
    let bestDistance = Infinity;
    for (const item of items) {
      if (item.kind !== 'small' && item.kind !== 'orange-small') continue;
      const reach = cat.radius + config.items.radius[item.kind];
      const above = cat.pos.y - item.pos.y;
      if (above < -reach * 0.5) continue;
      const timeToLand = Math.max(0, above) / item.vy;
      const distance = Math.abs(item.pos.x - cat.pos.x);
      if (distance - reach > speed * timeToLand) continue;
      const from = Math.min(cat.pos.x, item.pos.x);
      const to = Math.max(cat.pos.x, item.pos.x);
      if (zones.some((zone) => zone.left < to && zone.right > from)) continue;
      if (timeToLand < bestTime || (timeToLand === bestTime && distance < bestDistance)) {
        best = item;
        bestTime = timeToLand;
        bestDistance = distance;
      }
    }
    return best;
  }

  step(cat: Cat, items: readonly Item[], dt: number): void {
    const maxStep = config.blackCat.speed * config.grayCat.speedRatio * dt;
    const zones = this.dangerZones(cat, items);
    const x = cat.pos.x;

    const inside = zones.find((zone) => zone.left < x && zone.right > x);
    if (inside) {
      // 往較近且不會撞牆的一側閃開。
      const leftOk = inside.left - cat.radius >= 0;
      const rightOk = inside.right + cat.radius <= config.arena.width;
      const goLeft = leftOk && (!rightOk || x - inside.left <= inside.right - x);
      cat.pos.x = clampX(x + (goLeft ? -maxStep : maxStep), cat.radius);
      this.targetId = undefined;
      return;
    }

    const target = this.selectTarget(cat, items);
    this.targetId = target?.id;
    if (!target) return;
    let next = x + Math.max(-maxStep, Math.min(maxStep, target.pos.x - x));
    for (const zone of zones) {
      if (next > x && zone.left >= x && zone.left < next) next = zone.left;
      if (next < x && zone.right <= x && zone.right > next) next = zone.right;
    }
    cat.pos.x = clampX(next, cat.radius);
  }
}

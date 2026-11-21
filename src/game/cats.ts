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

function clampToArena(pos: Position, radius: number): void {
  const { width, height } = config.arena;
  pos.x = Math.max(radius, Math.min(width - radius, pos.x));
  pos.y = Math.max(radius, Math.min(height - radius, pos.y));
}

export function overlaps(cat: Pick<Cat, 'pos' | 'radius'>, item: Item): boolean {
  return Math.hypot(cat.pos.x - item.pos.x, cat.pos.y - item.pos.y) < cat.radius + config.items.radius[item.kind];
}

/** 八方向移動；對角線輸入正規化成與單向相同的速度。 */
export function moveBlackCat(cat: Cat, x: number, y: number, dt: number): void {
  if (x === 0 && y === 0) return;
  const step = config.blackCat.speed * dt / Math.hypot(x, y);
  cat.pos.x += x * step;
  cat.pos.y += y * step;
  clampToArena(cat.pos, cat.radius);
}

function distanceToSegment(point: Position, from: Position, to: Position): number {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const lengthSquared = dx * dx + dy * dy;
  const t = lengthSquared === 0
    ? 0
    : Math.max(0, Math.min(1, ((point.x - from.x) * dx + (point.y - from.y) * dy) / lengthSquared));
  return Math.hypot(point.x - (from.x + dx * t), point.y - (from.y + dy * t));
}

/** 灰貓 AI：只追最近的小魚干（含橘色），繞開辣椒；被卡住就改追可安全抵達的小魚干。 */
export class GrayCatAI {
  targetId: number | undefined;
  private bestDistance = Infinity;
  private stalledSeconds = 0;
  /** 上次繞行的方向（+1／−1）；同幅度偏航時優先沿用，避免左右搖擺。 */
  private turnSide = 1;
  /** 被判定卡住的目標；全部消失後恢復一般選取。 */
  private readonly blocked = new Set<number>();

  reset(): void {
    this.targetId = undefined;
    this.bestDistance = Infinity;
    this.stalledSeconds = 0;
    this.blocked.clear();
  }

  /** 最近的小魚干；有卡住紀錄時優先選路線上沒有辣椒的，都沒有才退回最近的。 */
  selectTarget(pos: Position, items: readonly Item[]): Item | undefined {
    for (const id of this.blocked) {
      if (!items.some((item) => item.id === id)) this.blocked.delete(id);
    }
    const chilis = items.filter((item) => item.kind === 'chili');
    let nearest: Item | undefined;
    let nearestSafe: Item | undefined;
    let nearestDistance = Infinity;
    let nearestSafeDistance = Infinity;
    for (const item of items) {
      if (item.kind !== 'small' && item.kind !== 'orange-small') continue;
      if (this.blocked.has(item.id)) continue;
      const distance = Math.hypot(item.pos.x - pos.x, item.pos.y - pos.y);
      if (distance < nearestDistance) {
        nearest = item;
        nearestDistance = distance;
      }
      if (distance < nearestSafeDistance
        && chilis.every((chili) => distanceToSegment(chili.pos, pos, item.pos) >= config.grayCat.avoidRadius)) {
        nearestSafe = item;
        nearestSafeDistance = distance;
      }
    }
    return this.blocked.size > 0 ? nearestSafe ?? nearest : nearest;
  }

  step(cat: Cat, items: readonly Item[], dt: number): void {
    const { speedRatio, lookahead, avoidMargin, stuckSeconds, stuckDistance } = config.grayCat;
    const target = this.selectTarget(cat.pos, items);
    if (target?.id !== this.targetId) {
      this.targetId = target?.id;
      this.bestDistance = Infinity;
      this.stalledSeconds = 0;
    }
    if (!target) return;

    const distance = Math.hypot(target.pos.x - cat.pos.x, target.pos.y - cat.pos.y);
    if (distance < this.bestDistance - stuckDistance) {
      this.bestDistance = distance;
      this.stalledSeconds = 0;
    } else {
      this.stalledSeconds += dt;
      if (this.stalledSeconds >= stuckSeconds) {
        this.blocked.add(target.id);
        this.targetId = undefined;
        return;
      }
    }
    if (distance === 0) return;

    const chilis = items.filter((item) => item.kind === 'chili');
    const clearance = cat.radius + config.items.radius.chili + avoidMargin;
    const stepLength = Math.min(config.blackCat.speed * speedRatio * dt, distance);
    const heading = Math.atan2(target.pos.y - cat.pos.y, target.pos.x - cat.pos.x);
    const { width, height } = config.arena;

    // 先以前方偵測距離找不會擦到辣椒的方向，偏離目標方向越小越優先；都不行再只看一步。
    for (const reach of [Math.min(lookahead, distance), stepLength]) {
      for (let k = 0; k <= 8; k++) {
        for (const side of k === 0 ? [0] : [this.turnSide, -this.turnSide]) {
          const angle = heading + side * k * Math.PI / 8;
          const end = { x: cat.pos.x + Math.cos(angle) * reach, y: cat.pos.y + Math.sin(angle) * reach };
          if (end.x < cat.radius || end.x > width - cat.radius || end.y < cat.radius || end.y > height - cat.radius) {
            continue;
          }
          // 已在安全距離內的辣椒，只要不再更靠近就允許（讓貓能離開）。
          const blocked = chilis.some((chili) => {
            const current = Math.hypot(chili.pos.x - cat.pos.x, chili.pos.y - cat.pos.y);
            return distanceToSegment(chili.pos, cat.pos, end) < Math.min(clearance, current - 1e-6);
          });
          if (blocked) continue;
          if (side !== 0) this.turnSide = side;
          cat.pos.x += Math.cos(angle) * stepLength;
          cat.pos.y += Math.sin(angle) * stepLength;
          clampToArena(cat.pos, cat.radius);
          return;
        }
      }
    }
  }
}

import { config } from '../config';
import { GrayCatAI, moveBlackCat, overlaps, type Cat } from './cats';
import { OrangeCat } from './orange-cat';
import { emptyCounts, recordFood, type Counts } from './scoring';
import { chooseKind, difficultyAt, spawnPosition, type Item, type Random } from './spawner';
import { remainingTime } from './timer';

export type Mode = 'menu' | 'playing' | 'paused' | 'result' | 'fail';

export interface RoundOptions {
  random?: Random;
  /** 橘色小魚干被撿取時呼叫（播放喵聲）；不影響回合數值。 */
  onOrangePickup?: () => void;
}

export class Round {
  mode: Mode = 'menu';
  elapsed = 0;
  lives: number = config.lives;
  score = 0;
  counts: Counts = emptyCounts();
  readonly items: Item[] = [];
  readonly black: Cat = { kind: 'black', pos: { x: 0, y: 0 }, radius: config.blackCat.radius, invulnUntil: 0 };
  readonly gray: Cat = { kind: 'gray', pos: { x: 0, y: 0 }, radius: config.grayCat.radius, invulnUntil: 0 };
  readonly orangeCat = new OrangeCat();
  readonly grayAI = new GrayCatAI();
  private nextSpawnAt = 0;
  private nextId = 1;
  private readonly random: Random;
  private readonly onOrangePickup: (() => void) | undefined;

  constructor(options: RoundOptions = {}) {
    this.random = options.random ?? Math.random;
    this.onOrangePickup = options.onOrangePickup;
    this.placeCats();
  }

  get timeLeft(): number {
    return remainingTime(this.elapsed);
  }

  /** 開始或重新開始一回合（「再玩一次」直接回到這裡）。 */
  start(): void {
    this.mode = 'playing';
    this.elapsed = 0;
    this.lives = config.lives;
    this.score = 0;
    this.counts = emptyCounts();
    this.items.length = 0;
    this.orangeCat.reset();
    this.grayAI.reset();
    this.nextSpawnAt = 0;
    this.placeCats();
  }

  togglePause(): void {
    if (this.mode === 'playing') this.mode = 'paused';
    else if (this.mode === 'paused') this.mode = 'playing';
  }

  /** 放入一個物品；生成器與測試共用，確保 id 與存活時間一致。 */
  addItem(kind: Item['kind'], pos: Item['pos'], spawnTime = this.elapsed): Item {
    const item = { id: this.nextId++, kind, pos, spawnTime, ttl: config.items.ttlSeconds };
    this.items.push(item);
    return item;
  }

  advance(dt: number, inputX: number, inputY: number): void {
    if (this.mode !== 'playing') return;
    const step = Math.min(dt, this.timeLeft);
    this.elapsed += step;

    moveBlackCat(this.black, inputX, inputY, step);
    this.grayAI.step(this.gray, this.items, step);
    this.orangeCat.advance(step);
    this.expireItems();
    this.resolvePickups();
    if (this.lives === 0) {
      this.mode = 'fail';
      return;
    }
    this.spawnDue();
    if (this.timeLeft === 0) this.mode = 'result';
  }

  private placeCats(): void {
    const { width, height } = config.arena;
    Object.assign(this.black.pos, { x: width / 2 - 80, y: height / 2 });
    Object.assign(this.gray.pos, { x: width / 2 + 80, y: height / 2 });
    this.black.invulnUntil = 0;
    this.gray.invulnUntil = 0;
  }

  private expireItems(): void {
    for (let i = this.items.length - 1; i >= 0; i--) {
      const item = this.items[i]!;
      if (this.elapsed - item.spawnTime >= item.ttl) this.items.splice(i, 1);
    }
  }

  /** 先搶先得：每個物品最多被一隻貓處理一次，處理後當帧移除。 */
  private resolvePickups(): void {
    for (let i = 0; i < this.items.length;) {
      const item = this.items[i]!;
      const cat = [this.black, this.gray].find((candidate) =>
        overlaps(candidate, item) && (item.kind !== 'chili' || this.elapsed >= candidate.invulnUntil));
      if (!cat) {
        i++;
        continue;
      }

      this.items.splice(i, 1);
      if (item.kind === 'chili') {
        this.lives--;
        this.counts.chiliHits++;
        cat.invulnUntil = this.elapsed + config.invulnerableSeconds;
        if (this.lives === 0) return;
      } else {
        this.score += recordFood(this.counts, item.kind);
        if (item.kind === 'orange-small') {
          this.orangeCat.trigger(item.pos.x);
          this.onOrangePickup?.();
        }
      }
    }
  }

  private spawnDue(): void {
    while (this.elapsed >= this.nextSpawnAt) {
      const spawnTime = this.nextSpawnAt;
      const { interval, chiliRatio } = difficultyAt(spawnTime);
      this.nextSpawnAt += interval;
      if (this.items.length >= config.items.maxOnField) continue;
      const pos = spawnPosition(this.random, [this.black.pos, this.gray.pos]);
      if (pos) this.addItem(chooseKind(this.random, chiliRatio), pos, spawnTime);
    }
  }
}

import { config } from '../config';
import { GrayCatAI, groundY, moveBlackCat, overlaps, type Cat } from './cats';
import { OrangeCat } from './orange-cat';
import { emptyCounts, recordFood, type Counts } from './scoring';
import { chooseKind, difficultyAt, spawnPosition, type FoodKind, type Item, type Random } from './spawner';
import { remainingTime } from './timer';

export type Mode = 'menu' | 'playing' | 'paused' | 'result' | 'fail';

export interface RoundOptions {
  random?: Random;
  /** 任一隻貓接到食物時呼叫（播放音效）；不影響回合數值。 */
  onCatch?: (kind: FoodKind) => void;
  /** 橘貓從畫面外跳出來時呼叫（喵一聲）；演出中再觸發不會呼叫。 */
  onOrangeCatAppear?: () => void;
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
  private readonly options: RoundOptions;

  constructor(options: RoundOptions = {}) {
    this.random = options.random ?? Math.random;
    this.options = options;
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

  /** 放入一個物品；生成器與測試共用。未指定速度時依當下難度與種類決定。 */
  addItem(
    kind: Item['kind'],
    pos: Item['pos'],
    vy = difficultyAt(this.elapsed).fallSpeed * config.items.fallSpeedScale[kind],
    spawnTime = this.elapsed,
  ): Item {
    const item = { id: this.nextId++, kind, pos, vy, spawnTime };
    this.items.push(item);
    return item;
  }

  /** inputX：黑貓的左右輸入（−1、0、1）。 */
  advance(dt: number, inputX: number): void {
    if (this.mode !== 'playing') return;
    const step = Math.min(dt, this.timeLeft);
    this.elapsed += step;

    moveBlackCat(this.black, inputX, step);
    this.grayAI.step(this.gray, this.items, step);
    this.orangeCat.advance(step);
    for (const item of this.items) item.pos.y += item.vy * step;
    this.resolveCatches();
    if (this.lives === 0) {
      this.mode = 'fail';
      return;
    }
    this.removeFallen();
    this.spawnDue();
    if (this.timeLeft === 0) this.mode = 'result';
  }

  private placeCats(): void {
    const { width } = config.arena;
    Object.assign(this.black.pos, { x: width / 2 - 80, y: groundY() });
    Object.assign(this.gray.pos, { x: width / 2 + 80, y: groundY() });
    this.black.invulnUntil = 0;
    this.gray.invulnUntil = 0;
  }

  /** 沒被接住、完全掉出畫面底部的物品就消失（R8）。 */
  private removeFallen(): void {
    const { height } = config.arena;
    for (let i = this.items.length - 1; i >= 0; i--) {
      const item = this.items[i]!;
      if (item.pos.y - config.items.radius[item.kind] > height) this.items.splice(i, 1);
    }
  }

  /** 先搶先得：每個物品最多被一隻貓處理一次，處理後當帧移除。 */
  private resolveCatches(): void {
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
        this.options.onCatch?.(item.kind);
        if (item.kind === 'orange-small' && this.orangeCat.trigger(item.pos.x)) this.options.onOrangeCatAppear?.();
      }
    }
  }

  private spawnDue(): void {
    while (this.elapsed >= this.nextSpawnAt) {
      const spawnTime = this.nextSpawnAt;
      const { interval, chiliRatio, fallSpeed } = difficultyAt(spawnTime);
      this.nextSpawnAt += interval;
      if (this.items.length >= config.items.maxOnField) continue;
      const kind = chooseKind(this.random, chiliRatio);
      const pos = spawnPosition(this.random, kind);
      // 補上排程時間到現在已經落下的距離，讓實際節奏不受帧率影響。
      const vy = fallSpeed * config.items.fallSpeedScale[kind];
      pos.y += vy * (this.elapsed - spawnTime);
      this.addItem(kind, pos, vy, spawnTime);
    }
  }
}

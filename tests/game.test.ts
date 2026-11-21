import { describe, expect, it, vi } from 'vitest';
import { config } from '../src/config';
import { GrayCatAI, overlaps, type Cat } from '../src/game/cats';
import { OrangeCat } from '../src/game/orange-cat';
import { gradeFor } from '../src/game/scoring';
import { chooseKind, difficultyAt, type Item } from '../src/game/spawner';
import { Round } from '../src/game/state';

const FRAME = 1 / 60;

/** 可重現的亂數（mulberry32）。 */
function seeded(seed: number): () => number {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 已開始、但尚未生成任何物品的回合；亂數讓生成點落在右下角，遠離測試擺放的物品。 */
function startedRound(onOrangePickup?: () => void): Round {
  const round = new Round({ random: () => 0.999, onOrangePickup });
  round.start();
  return round;
}

describe('黑貓控制（Gate 1）', () => {
  const { width, height } = config.arena;
  const r = config.blackCat.radius;

  it.each([
    [-1, -1, r, r], [0, -1, width / 2 - 80, r], [1, -1, width - r, r],
    [-1, 0, r, height / 2], [1, 0, width - r, height / 2],
    [-1, 1, r, height - r], [0, 1, width / 2 - 80, height - r], [1, 1, width - r, height - r],
  ])('輸入 (%i, %i) 可抵達邊界 (%d, %d) 且不出界', (x, y, expectedX, expectedY) => {
    const round = startedRound();
    for (let i = 0; i < 300; i++) round.advance(FRAME, x, y);
    expect(round.black.pos.x).toBeCloseTo(expectedX);
    expect(round.black.pos.y).toBeCloseTo(expectedY);
  });

  it('對角線速度等於單向速度', () => {
    for (const [x, y] of [[1, 0], [1, 1], [-1, 1]]) {
      const round = startedRound();
      const start = { ...round.black.pos };
      round.advance(0.2, x!, y!);
      expect(Math.hypot(round.black.pos.x - start.x, round.black.pos.y - start.y)).toBeCloseTo(config.blackCat.speed * 0.2);
    }
  });

  it('暫停時倒數、移動與生成全停', () => {
    const round = startedRound();
    round.advance(1, 0, 0);
    const snapshot = { elapsed: round.elapsed, items: round.items.length, pos: { ...round.black.pos } };
    round.togglePause();
    for (let i = 0; i < 300; i++) round.advance(FRAME, 1, 1);
    expect(round.elapsed).toBe(snapshot.elapsed);
    expect(round.items).toHaveLength(snapshot.items);
    expect(round.black.pos).toEqual(snapshot.pos);
    round.togglePause();
    round.advance(1, 0, 0);
    expect(round.elapsed).toBe(snapshot.elapsed + 1);
  });
});

describe('物品與灰貓（Gate 2）', () => {
  it.each([
    ['small', 10, 'small'], ['big', 50, 'big'], ['can', 100, 'can'], ['orange-small', 10, 'orange'],
  ] as const)('%s 得 %i 分並計入魚獲', (kind, points, countKey) => {
    const round = startedRound();
    round.addItem(kind, { ...round.black.pos });
    round.advance(FRAME, 0, 0);
    expect(round.score).toBe(points);
    expect(round.counts[countKey]).toBe(1);
    expect(round.lives).toBe(config.lives);
  });

  it('兩貓同時重疊同一物品只計一次分', () => {
    const round = startedRound();
    round.black.pos.x = round.gray.pos.x = 400;
    round.black.pos.y = round.gray.pos.y = 100;
    const item = round.addItem('can', { x: 400, y: 100 });
    round.advance(FRAME, 0, 0);
    round.advance(FRAME, 0, 0);
    expect(round.score).toBe(100);
    expect(round.counts.can).toBe(1);
    expect(round.items).not.toContain(item);
  });

  it('未撿取的物品在存活時間到期後消失', () => {
    const round = startedRound();
    const item = round.addItem('small', { x: 60, y: 60 });
    round.grayAI.selectTarget = () => undefined;
    for (let t = 0; t < config.items.ttlSeconds - 0.1; t += FRAME) round.advance(FRAME, 0, 0);
    expect(round.items).toContain(item);
    round.advance(0.2, 0, 0);
    expect(round.items).not.toContain(item);
  });

  const item = (id: number, kind: Item['kind'], x: number, y: number): Item =>
    ({ id, kind, pos: { x, y }, spawnTime: 0, ttl: config.items.ttlSeconds });
  const grayCat = (x: number, y: number): Cat =>
    ({ kind: 'gray', pos: { x, y }, radius: config.grayCat.radius, invulnUntil: 0 });

  it('灰貓只追最近的小魚干（含橘色），目標消失立即改選', () => {
    const ai = new GrayCatAI();
    const items = [
      item(1, 'big', 110, 100), item(2, 'can', 100, 120), item(3, 'chili', 90, 100),
      item(4, 'small', 300, 100), item(5, 'orange-small', 250, 100),
    ];
    expect(ai.selectTarget({ x: 100, y: 100 }, items)?.id).toBe(5);
    expect(ai.selectTarget({ x: 100, y: 100 }, items.filter((entry) => entry.id !== 5))?.id).toBe(4);
    expect(ai.selectTarget({ x: 100, y: 100 }, items.slice(0, 3))).toBeUndefined();
  });

  /** 讓灰貓走到撿起目標為止；途中不可碰到任何辣椒。 */
  function chase(cat: Cat, items: Item[], goalId: number, seconds: number): number {
    const ai = new GrayCatAI();
    for (let t = 0; t < seconds; t += FRAME) {
      ai.step(cat, items, FRAME);
      for (const chili of items.filter((entry) => entry.kind === 'chili')) expect(overlaps(cat, chili)).toBe(false);
      if (overlaps(cat, items.find((entry) => entry.id === goalId)!)) return t;
    }
    throw new Error('灰貓沒有抵達目標');
  }

  it('灰貓繞開擋在路上的辣椒', () => {
    const cat = grayCat(100, 225);
    const items = [item(1, 'small', 500, 225), item(2, 'chili', 300, 225), item(3, 'chili', 300, 190)];
    chase(cat, items, 1, 5);
  });

  it('被辣椒圍住的目標會讓灰貓改選可安全抵達的小魚干', () => {
    const cat = grayCat(60, 225);
    const trapped = item(1, 'small', 200, 225);
    const ring = Array.from({ length: 8 }, (_, i) =>
      item(10 + i, 'chili', 200 + Math.cos(i * Math.PI / 4) * 45, 225 + Math.sin(i * Math.PI / 4) * 45));
    const safe = item(2, 'small', 60, 420);
    const items = [trapped, ...ring, safe];
    expect(new GrayCatAI().selectTarget(cat.pos, items)?.id).toBe(1);
    chase(cat, items, 2, 6);
  });
});

describe('回合與生命（Gate 3）', () => {
  it('任一隻貓碰到辣椒扣一條命，受擊後無敵時間內不再扣命', () => {
    const round = startedRound();
    round.addItem('chili', { ...round.black.pos });
    round.advance(FRAME, 0, 0);
    expect(round.lives).toBe(config.lives - 1);

    const second = round.addItem('chili', { ...round.black.pos });
    for (let t = FRAME; t < config.invulnerableSeconds - 0.05; t += FRAME) round.advance(FRAME, 0, 0);
    expect(round.lives).toBe(config.lives - 1);
    expect(round.items).toContain(second);
    round.advance(0.1, 0, 0);
    expect(round.lives).toBe(config.lives - 2);
    expect(round.counts.chiliHits).toBe(2);

    round.grayAI.step = () => {};
    round.addItem('chili', { ...round.gray.pos });
    round.advance(FRAME, 0, 0);
    expect(round.mode).toBe('fail');
    expect(round.lives).toBe(0);
  });

  it('命數歸零立即結束，時間不再前進', () => {
    const round = startedRound();
    round.lives = 1;
    round.addItem('chili', { ...round.black.pos });
    round.advance(FRAME, 0, 0);
    const elapsed = round.elapsed;
    round.advance(1, 0, 0);
    expect(round.mode).toBe('fail');
    expect(round.elapsed).toBe(elapsed);
  });

  it('時間到進入結果畫面，再玩一次回到回合開頭', () => {
    const round = startedRound();
    round.addItem('can', { ...round.black.pos });
    for (let t = 0; t < config.roundSeconds + 1; t += 0.5) round.advance(0.5, 0, 0);
    expect(round.mode).toBe('result');
    expect(round.timeLeft).toBe(0);
    expect(round.score).toBeGreaterThan(0);

    round.start();
    expect(round).toMatchObject({ mode: 'playing', elapsed: 0, score: 0, lives: config.lives, items: [] });
    expect(round.timeLeft).toBe(config.roundSeconds);
    expect(round.counts).toEqual({ small: 0, big: 0, can: 0, orange: 0, chiliHits: 0 });
  });

  it('依 config 的分數線給評級，剛好達標即升級', () => {
    const grades = config.grades;
    for (let i = 0; i < grades.length; i++) {
      expect(gradeFor(grades[i]!.minScore)).toBe(grades[i]!.grade);
      if (i > 0) expect(gradeFor(grades[i - 1]!.minScore - 1)).toBe(grades[i]!.grade);
    }
    expect(gradeFor(0)).toBe('D');
  });
});

describe('橘貓彩蛋（Gate 4）', () => {
  it('撿到橘色小魚干觸發橘貓與喵聲，分數與生命照常', () => {
    const meow = vi.fn();
    const round = startedRound(meow);
    round.addItem('orange-small', { ...round.black.pos });
    round.advance(FRAME, 0, 0);
    expect(meow).toHaveBeenCalledOnce();
    expect(round.orangeCat.state).toBe('entering');
    expect(round).toMatchObject({ score: config.items.scores['orange-small'], lives: config.lives });
  });

  it('連續觸發不疊加，只重置演出時長', () => {
    const { enterSeconds, holdSeconds, leaveSeconds } = config.orangeCat;
    const cat = new OrangeCat();
    cat.trigger(100);
    cat.advance(enterSeconds);
    cat.advance(holdSeconds - 0.1);
    cat.trigger(600);
    cat.advance(0.2);
    expect(cat).toMatchObject({ state: 'holding', shown: 1, x: 100 });
    cat.advance(holdSeconds);
    cat.advance(leaveSeconds);
    expect(cat.state).toBe('idle');
  });
});

describe('難度曲線（Gate 5）', () => {
  it('出怪間隔與辣椒比例依已用時長線性插值', () => {
    expect(difficultyAt(0)).toEqual({ interval: 1.2, chiliRatio: 0.1 });
    expect(difficultyAt(90).interval).toBeCloseTo(0.825);
    expect(difficultyAt(90).chiliRatio).toBeCloseTo(0.175);
    expect(difficultyAt(120).interval).toBeCloseTo(0.7);
    expect(difficultyAt(120).chiliRatio).toBeCloseTo(0.2);
  });

  it('第 90–120 秒的實際生成節奏與辣椒比例符合曲線', () => {
    const round = new Round({ random: seeded(7) });
    round.start();
    const seen = new Map<number, Item>();
    while (round.mode === 'playing') {
      round.advance(FRAME, 0, 0);
      for (const entry of round.items) seen.set(entry.id, entry);
    }
    const late = [...seen.values()].filter((entry) => entry.spawnTime >= 90);
    for (let i = 1; i < late.length; i++) {
      expect(late[i]!.spawnTime - late[i - 1]!.spawnTime).toBeCloseTo(difficultyAt(late[i - 1]!.spawnTime).interval);
    }
    expect(late.length).toBeGreaterThan(30 / 0.825 - 1);

    const random = seeded(11);
    let chilis = 0;
    const draws = 50_000;
    for (let i = 0; i < draws; i++) if (chooseKind(random, difficultyAt(105).chiliRatio) === 'chili') chilis++;
    expect(chilis / draws).toBeCloseTo(0.1875, 2);
  });
});

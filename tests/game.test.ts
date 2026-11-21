import { describe, expect, it, vi } from 'vitest';
import { config } from '../src/config';
import { GrayCatAI, groundY, overlaps, type Cat } from '../src/game/cats';
import { OrangeCat } from '../src/game/orange-cat';
import { gradeFor } from '../src/game/scoring';
import { chooseKind, difficultyAt, type Item } from '../src/game/spawner';
import { Round, type RoundOptions } from '../src/game/state';

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

/** 已開始的回合；亂數讓自動生成的小魚干都從最右側掉落，遠離測試擺放的物品。 */
function startedRound(options: Omit<RoundOptions, 'random'> = {}): Round {
  const round = new Round({ random: () => 0.999, ...options });
  round.start();
  return round;
}

describe('黑貓控制（Gate 1）', () => {
  const { width } = config.arena;
  const r = config.blackCat.radius;

  it.each([[-1, r], [1, width - r]])('沿地面往 %i 方向走到邊界 %d 且不出界', (input, expectedX) => {
    const round = startedRound();
    for (let i = 0; i < 300; i++) round.advance(FRAME, input);
    expect(round.black.pos).toEqual({ x: expectedX, y: groundY(r) });
  });

  it('移動速度固定，不受輸入大小影響', () => {
    const round = startedRound();
    const startX = round.black.pos.x;
    round.advance(0.2, 1);
    expect(round.black.pos.x - startX).toBeCloseTo(config.blackCat.speed * 0.2);
  });

  it('暫停時倒數、移動、掉落與生成全停', () => {
    const round = startedRound();
    round.advance(1, 0);
    const snapshot = JSON.stringify({ elapsed: round.elapsed, items: round.items, black: round.black.pos });
    round.togglePause();
    for (let i = 0; i < 300; i++) round.advance(FRAME, 1);
    expect(JSON.stringify({ elapsed: round.elapsed, items: round.items, black: round.black.pos })).toBe(snapshot);
    round.togglePause();
    round.advance(1, 0);
    expect(round.elapsed).toBe(2);
  });
});

describe('掉落物與灰貓（Gate 2）', () => {
  it('物品從畫面上方生成並依速度往下掉', () => {
    const round = startedRound();
    round.advance(FRAME, 0);
    const [spawned] = round.items;
    expect(spawned!.pos.y).toBeLessThan(0);
    const item = round.addItem('big', { x: 100, y: 50 }, 120);
    round.advance(0.5, 0);
    expect(item.pos.y).toBeCloseTo(110);
  });

  it.each([
    ['small', 10, 'small'], ['big', 50, 'big'], ['can', 100, 'can'], ['orange-small', 10, 'orange'],
  ] as const)('接到 %s 得 %i 分、計入魚獲並播放音效', (kind, points, countKey) => {
    const onCatch = vi.fn();
    const round = startedRound({ onCatch });
    round.addItem(kind, { ...round.black.pos });
    round.advance(FRAME, 0);
    expect(round.score).toBe(points);
    expect(round.counts[countKey]).toBe(1);
    expect(round.lives).toBe(config.lives);
    expect(onCatch).toHaveBeenCalledExactlyOnceWith(kind);
  });

  it('兩貓同時接到同一物品只計一次分', () => {
    const round = startedRound();
    round.black.pos.x = round.gray.pos.x = 400;
    const item = round.addItem('can', { x: 400, y: round.black.pos.y }, 0);
    round.advance(FRAME, 0);
    round.advance(FRAME, 0);
    expect(round.score).toBe(100);
    expect(round.counts.can).toBe(1);
    expect(round.items).not.toContain(item);
  });

  it('沒接到的物品掉出畫面底部後消失', () => {
    const round = startedRound();
    const { height } = config.arena;
    const item = round.addItem('big', { x: 60, y: height - 10 }, 100);
    round.advance(0.2, 0);
    expect(round.items).toContain(item);
    round.advance(0.2, 0);
    expect(round.items).not.toContain(item);
  });

  const item = (id: number, kind: Item['kind'], x: number, y: number, vy = 150): Item =>
    ({ id, kind, pos: { x, y }, vy, spawnTime: 0 });
  const grayY = groundY(config.grayCat.radius);
  const grayCat = (x: number): Cat => ({ kind: 'gray', pos: { x, y: grayY }, radius: config.grayCat.radius, invulnUntil: 0 });

  /** 讓物品掉落、灰貓行動；回傳灰貓接到的物品 id，途中不可碰到辣椒。 */
  function play(cat: Cat, items: Item[], seconds: number): number[] {
    const ai = new GrayCatAI();
    const caught: number[] = [];
    for (let t = 0; t < seconds; t += FRAME) {
      ai.step(cat, items, FRAME);
      for (const entry of items) entry.pos.y += entry.vy * FRAME;
      for (let i = items.length - 1; i >= 0; i--) {
        if (!overlaps(cat, items[i]!)) continue;
        expect(items[i]!.kind, '灰貓碰到辣椒').not.toBe('chili');
        caught.push(items.splice(i, 1)[0]!.id);
      }
    }
    return caught;
  }

  it('灰貓只接來得及接到、最快落地的小魚干（含橘色），不追大魚干與罐頭', () => {
    const cat = grayCat(400);
    const y = grayY;
    const items = [
      item(1, 'big', 400, y - 40), item(2, 'can', 410, y - 60),
      item(3, 'small', 60, y - 30),
      item(4, 'small', 500, y - 300),
      item(5, 'orange-small', 300, y - 200),
    ];
    expect(new GrayCatAI().selectTarget(cat, items)?.id).toBe(5);
    expect(new GrayCatAI().selectTarget(cat, items.filter((entry) => entry.id !== 5))?.id).toBe(4);
    expect(new GrayCatAI().selectTarget(cat, items.slice(0, 3))).toBeUndefined();
  });

  it('灰貓接住掉下來的小魚干', () => {
    const cat = grayCat(200);
    expect(play(cat, [item(1, 'small', 500, -10)], 4)).toEqual([1]);
  });

  it('辣椒正對著灰貓落下時會閃開', () => {
    const cat = grayCat(400);
    play(cat, [item(1, 'chili', 400, grayY - 150), item(2, 'chili', 430, grayY - 220)], 3);
    expect(cat.pos.x).not.toBe(400);
  });

  it('路線被即將落地的辣椒擋住時，改接可安全抵達的小魚干', () => {
    const cat = grayCat(400);
    const y = grayY;
    const blocked = item(1, 'small', 560, y - 120);
    const safe = item(2, 'small', 300, y - 200);
    const items = [item(9, 'chili', 470, y - 60), blocked, safe];
    expect(new GrayCatAI().selectTarget(cat, items)?.id).toBe(2);
    expect(play(cat, items, 3)).toContain(2);
  });
});

describe('回合與生命（Gate 3）', () => {
  it('任一隻貓碰到辣椒扣一條命，受擊後無敵時間內不再扣命', () => {
    const round = startedRound();
    round.addItem('chili', { ...round.black.pos }, 0);
    round.advance(FRAME, 0);
    expect(round.lives).toBe(config.lives - 1);

    const second = round.addItem('chili', { ...round.black.pos }, 0);
    for (let t = FRAME; t < config.invulnerableSeconds - 0.05; t += FRAME) round.advance(FRAME, 0);
    expect(round.lives).toBe(config.lives - 1);
    expect(round.items).toContain(second);
    round.advance(0.1, 0);
    expect(round.lives).toBe(config.lives - 2);
    expect(round.counts.chiliHits).toBe(2);

    round.grayAI.step = () => {};
    round.addItem('chili', { ...round.gray.pos }, 0);
    round.advance(FRAME, 0);
    expect(round.mode).toBe('fail');
    expect(round.lives).toBe(0);
  });

  it('命數歸零立即結束，時間不再前進', () => {
    const round = startedRound();
    round.lives = 1;
    round.addItem('chili', { ...round.black.pos });
    round.advance(FRAME, 0);
    const elapsed = round.elapsed;
    round.advance(1, 0);
    expect(round.mode).toBe('fail');
    expect(round.elapsed).toBe(elapsed);
  });

  it('時間到進入結果畫面，再玩一次回到回合開頭', () => {
    const round = startedRound();
    round.addItem('can', { ...round.black.pos });
    for (let t = 0; t < config.roundSeconds + 1; t += 0.5) round.advance(0.5, 0);
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
  it('接到橘色小魚干時橘貓跳出來喵一聲，演出中再接到不重複喵、分數照常', () => {
    const meow = vi.fn();
    const round = startedRound({ onOrangeCatAppear: meow });
    round.addItem('orange-small', { ...round.black.pos });
    round.advance(FRAME, 0);
    expect(meow).toHaveBeenCalledOnce();
    expect(round.orangeCat.state).toBe('entering');

    round.addItem('orange-small', { ...round.black.pos });
    round.advance(FRAME, 0);
    expect(meow).toHaveBeenCalledOnce();
    expect(round).toMatchObject({ score: 2 * config.items.scores['orange-small'], lives: config.lives });

    const { enterSeconds, holdSeconds, leaveSeconds } = config.orangeCat;
    for (let t = 0; t < enterSeconds + holdSeconds + leaveSeconds + 0.2; t += FRAME) round.advance(FRAME, 0);
    expect(round.orangeCat.state).toBe('idle');
    round.addItem('orange-small', { ...round.black.pos });
    round.advance(FRAME, 0);
    expect(meow).toHaveBeenCalledTimes(2);
  });

  it('連續觸發不疊加，只重置演出時長', () => {
    const { enterSeconds, holdSeconds, leaveSeconds } = config.orangeCat;
    const cat = new OrangeCat();
    expect(cat.trigger(100)).toBe(true);
    cat.advance(enterSeconds);
    cat.advance(holdSeconds - 0.1);
    expect(cat.trigger(600)).toBe(false);
    cat.advance(0.2);
    expect(cat).toMatchObject({ state: 'holding', shown: 1, x: 100 });
    cat.advance(holdSeconds);
    cat.advance(leaveSeconds);
    expect(cat.state).toBe('idle');
  });
});

describe('難度曲線（Gate 5）', () => {
  it('出怪間隔、辣椒比例與落下速度依已用時長線性插值', () => {
    const { spawnInterval, chiliRatio, fallSpeed } = config.difficulty;
    expect(difficultyAt(0)).toEqual({ interval: spawnInterval.start, chiliRatio: chiliRatio.start, fallSpeed: fallSpeed.start });
    const at90 = difficultyAt(90);
    expect(at90.interval).toBeCloseTo(spawnInterval.start + (spawnInterval.end - spawnInterval.start) * 0.75);
    expect(at90.chiliRatio).toBeCloseTo(chiliRatio.start + (chiliRatio.end - chiliRatio.start) * 0.75);
    expect(at90.fallSpeed).toBeCloseTo(fallSpeed.start + (fallSpeed.end - fallSpeed.start) * 0.75);
    expect(difficultyAt(120)).toEqual({ interval: spawnInterval.end, chiliRatio: chiliRatio.end, fallSpeed: fallSpeed.end });
  });

  it('第 90–120 秒的實際生成節奏、速度與辣椒比例符合曲線', () => {
    const round = new Round({ random: seeded(7) });
    round.start();
    const seen = new Map<number, Item>();
    while (round.mode === 'playing') {
      round.advance(FRAME, 0);
      for (const entry of round.items) seen.set(entry.id, entry);
    }
    const late = [...seen.values()].filter((entry) => entry.spawnTime >= 90);
    for (let i = 1; i < late.length; i++) {
      const previous = late[i - 1]!;
      expect(late[i]!.spawnTime - previous.spawnTime).toBeCloseTo(difficultyAt(previous.spawnTime).interval);
    }
    for (const entry of late) {
      expect(entry.vy).toBeCloseTo(difficultyAt(entry.spawnTime).fallSpeed * config.items.fallSpeedScale[entry.kind]);
    }
    expect(late.length).toBeGreaterThan(30 / difficultyAt(90).interval - 1);

    const random = seeded(11);
    let chilis = 0;
    const draws = 50_000;
    for (let i = 0; i < draws; i++) if (chooseKind(random, difficultyAt(105).chiliRatio) === 'chili') chilis++;
    expect(chilis / draws).toBeCloseTo(difficultyAt(105).chiliRatio, 2);
  });
});

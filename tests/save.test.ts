import { describe, expect, it } from 'vitest';
import { config } from '../src/config';
import { loadSave, recordRound } from '../src/save';

function memoryStorage(initial?: string) {
  const values = new Map<string, string>();
  if (initial !== undefined) values.set(config.storageKey, initial);
  return {
    values,
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => void values.set(key, value),
  };
}

describe('本機存檔（Gate 5）', () => {
  it('記錄回合後可在重新載入時讀回最佳分數與回合數', () => {
    const storage = memoryStorage();
    recordRound(320, storage);
    recordRound(150, storage);
    expect(loadSave(storage)).toEqual({ bestScore: 320, totalRounds: 2 });
  });

  it.each([
    ['負數', '{"bestScore":-5,"totalRounds":-1}', { bestScore: 0, totalRounds: 0 }],
    ['NaN 文字', 'NaN', { bestScore: 0, totalRounds: 0 }],
    ['錯誤型別', '{"bestScore":"900","totalRounds":null}', { bestScore: 0, totalRounds: 0 }],
    ['部分有效', '{"bestScore":1e999,"totalRounds":4}', { bestScore: 0, totalRounds: 4 }],
    ['陣列', '[1,2]', { bestScore: 0, totalRounds: 0 }],
    ['損毀 JSON', '{"bestScore":', { bestScore: 0, totalRounds: 0 }],
  ])('被篡改為%s時不崩潰並回預設值', (_label, raw, expected) => {
    const storage = memoryStorage(raw);
    expect(loadSave(storage)).toEqual(expected);
    expect(recordRound(30, storage)).toEqual({ bestScore: Math.max(30, expected.bestScore), totalRounds: expected.totalRounds + 1 });
  });

  it('儲存空間不可用時仍可遊玩', () => {
    const broken = {
      getItem: () => { throw new DOMException('blocked', 'SecurityError'); },
      setItem: () => { throw new DOMException('full', 'QuotaExceededError'); },
    };
    expect(loadSave(broken)).toEqual({ bestScore: 0, totalRounds: 0 });
    expect(recordRound(50, broken)).toEqual({ bestScore: 50, totalRounds: 1 });
  });
});

import { config } from './config';

export interface PersistedData {
  bestScore: number;
  totalRounds: number;
}

type SaveStorage = Pick<Storage, 'getItem' | 'setItem'>;

const isCount = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0;

/** 讀取失敗、格式錯誤或數值無效時，對應欄位回到預設值 0，不會拋出例外。 */
export function loadSave(storage?: Pick<Storage, 'getItem'>): PersistedData {
  let data: unknown;
  try {
    // 封鎖網站資料時，連讀取 localStorage 屬性都可能拋出 SecurityError。
    const raw = (storage ?? globalThis.localStorage).getItem(config.storageKey);
    data = raw == null ? undefined : JSON.parse(raw);
  } catch {
    data = undefined;
  }
  const record = typeof data === 'object' && data !== null ? data as Record<string, unknown> : {};
  return {
    bestScore: isCount(record.bestScore) ? record.bestScore : 0,
    totalRounds: isCount(record.totalRounds) ? record.totalRounds : 0,
  };
}

/** 回合結束時呼叫一次：總回合數加一，分數較高時更新最佳分數。 */
export function recordRound(score: number, storage?: SaveStorage): PersistedData {
  const saved = loadSave(storage);
  const next = {
    bestScore: isCount(score) ? Math.max(saved.bestScore, score) : saved.bestScore,
    totalRounds: saved.totalRounds + 1,
  };
  try {
    (storage ?? globalThis.localStorage).setItem(config.storageKey, JSON.stringify(next));
  } catch (error) {
    console.warn('無法寫入本機存檔。', error);
  }
  return next;
}

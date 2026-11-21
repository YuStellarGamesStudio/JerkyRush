/** UI 文字字典。英文為主要語言：偵測不到支援的語言時使用英文。 */

export const locales = ['en', 'zh-Hant', 'ja'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'en';

/** 語言選單上以各語言自己的名稱顯示。 */
export const localeNames: Record<Locale, string> = { en: 'English', 'zh-Hant': '繁體中文', ja: '日本語' };

const en = {
  documentTitle: 'Jerky Rush',
  description: 'A 120-second browser game: snacks rain from the sky and a black cat and a gray cat team up to catch them while dodging chili peppers.',
  eyebrow: 'TWO CATS · ONE SNACK RUSH',
  title: 'Jerky Rush',
  language: 'Language',
  score: 'Score',
  lives: 'Lives',
  time: 'Time',
  seconds: (n: number) => `${n}s`,
  livesLeft: (n: number) => `${n} ${n === 1 ? 'life' : 'lives'} left`,
  canvasLabel: 'Jerky Rush play area',
  ready: 'Ready?',
  rulePoints: (small: number, big: number, can: number) =>
    `Dried fish ${small} · Big jerky ${big} · Fish can ${can} pts`,
  ruleRound: (seconds: number, lives: number) =>
    `${seconds} seconds, ${lives} lives — a chili costs a life whichever cat touches it`,
  ruleHelpers: 'Catch the falling snacks! The gray cat catches dried fish too; orange fish summon the orange cat',
  start: 'Start',
  paused: 'Paused',
  resume: 'Resume',
  timeUp: "Time's up!",
  outOfLives: 'Out of lives',
  playAgain: 'Play again',
  pointsUnit: 'pts',
  newRecord: 'New record! ',
  record: (best: number, rounds: number) => `Best ${best} · ${rounds} ${rounds === 1 ? 'round' : 'rounds'} played`,
  countSmall: 'Dried fish',
  countBig: 'Big jerky',
  countCan: 'Fish can',
  countOrange: 'Orange fish',
  countChili: 'Chili hits',
  controls: 'A / D or ← / →: move the black cat · P / Esc: pause or resume',
  startupFailed: 'The game could not start. Please reload the page.',
  meow: 'Meow!',
};

export type Messages = typeof en;

const zhHant: Messages = {
  documentTitle: '小魚干大作戰｜Jerky Rush',
  description: '小魚干從天上掉下來，黑貓與灰貓在底下接、躲辣椒的 120 秒瀏覽器小遊戲。',
  eyebrow: 'JERKY RUSH',
  title: '小魚干大作戰',
  language: '語言',
  score: '分數',
  lives: '生命',
  time: '剩餘',
  seconds: (n) => `${n} 秒`,
  livesLeft: (n) => `剩 ${n} 條命`,
  canvasLabel: '小魚干大作戰遊戲區',
  ready: '準備好了嗎？',
  rulePoints: (small, big, can) => `小魚干 ${small}・大魚干 ${big}・魚罐頭 ${can} 分`,
  ruleRound: (seconds, lives) => `${seconds} 秒、${lives} 條命；辣椒會讓任一隻貓扣一條命`,
  ruleHelpers: '小魚干從天上掉下來，快去接！灰貓也會幫忙接小魚干，橘色小魚干會叫出橘貓',
  start: '開始',
  paused: '已暫停',
  resume: '繼續',
  timeUp: '時間到！',
  outOfLives: '生命耗盡',
  playAgain: '再玩一次',
  pointsUnit: '分',
  newRecord: '新紀錄！',
  record: (best, rounds) => `最佳分數 ${best}・已玩 ${rounds} 回合`,
  countSmall: '小魚干',
  countBig: '大魚干',
  countCan: '魚罐頭',
  countOrange: '橘色小魚干',
  countChili: '碰到辣椒',
  controls: 'A／D 或 ←／→：移動黑貓　·　P／Esc：暫停或繼續',
  startupFailed: '無法啟動遊戲，請重新整理。',
  meow: '喵～',
};

const ja: Messages = {
  documentTitle: 'にぼし大作戦｜Jerky Rush',
  description: '空から降ってくる煮干しを黒猫と灰色の猫が下でキャッチし、唐辛子をよける 120 秒のブラウザゲーム。',
  eyebrow: 'JERKY RUSH',
  title: 'にぼし大作戦',
  language: '言語',
  score: 'スコア',
  lives: 'ライフ',
  time: '残り',
  seconds: (n) => `${n} 秒`,
  livesLeft: (n) => `ライフ残り ${n}`,
  canvasLabel: 'にぼし大作戦のプレイエリア',
  ready: '準備はいい？',
  rulePoints: (small, big, can) => `煮干し ${small}・大きな煮干し ${big}・魚の缶詰 ${can} 点`,
  ruleRound: (seconds, lives) => `${seconds} 秒・ライフ ${lives}。どちらの猫が唐辛子に触れてもライフが 1 減る`,
  ruleHelpers: '空から落ちてくる煮干しをキャッチ！灰色の猫も煮干しを拾ってくれる。オレンジ煮干しで茶トラ猫が登場！',
  start: 'スタート',
  paused: '一時停止中',
  resume: '再開',
  timeUp: 'タイムアップ！',
  outOfLives: 'ライフがなくなった',
  playAgain: 'もう一度',
  pointsUnit: '点',
  newRecord: '新記録！',
  record: (best, rounds) => `ベスト ${best}・プレイ回数 ${rounds}`,
  countSmall: '煮干し',
  countBig: '大きな煮干し',
  countCan: '魚の缶詰',
  countOrange: 'オレンジ煮干し',
  countChili: '唐辛子被弾',
  controls: 'A／D または ←／→：黒猫を移動　·　P／Esc：一時停止／再開',
  startupFailed: 'ゲームを起動できませんでした。ページを再読み込みしてください。',
  meow: 'にゃ〜',
};

export const messages: Record<Locale, Messages> = { en, 'zh-Hant': zhHant, ja };

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (locales as readonly string[]).includes(value);
}

/** 依瀏覽器偏好語言順序挑第一個支援的語言；中文一律使用繁體字典。 */
export function detectLocale(preferred: readonly string[]): Locale {
  for (const tag of preferred) {
    const language = tag.toLowerCase().split('-')[0];
    if (language === 'en') return 'en';
    if (language === 'zh') return 'zh-Hant';
    if (language === 'ja') return 'ja';
  }
  return defaultLocale;
}

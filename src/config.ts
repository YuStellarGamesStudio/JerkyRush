/** 全部可調遊戲參數的唯一來源（R11）。時間單位為秒，長度單位為競技場像素。 */
export const config = {
  arena: { width: 800, height: 450 },
  /** 畫面底部地面帶的高度；貓的腳踩在它的上緣。 */
  groundHeight: 12,
  roundSeconds: 120,
  lives: 3,
  invulnerableSeconds: 1,

  /** 黑貓只能沿地面左右移動。 */
  blackCat: { radius: 36, speed: 320 },
  grayCat: {
    radius: 33,
    /** 相對黑貓速度的倍率。 */
    speedRatio: 0.8,
    /** 辣椒在此秒數內會落到貓的高度，就視為危險、不走進它下方。 */
    dangerSeconds: 0.7,
    /** 躲辣椒時，與辣椒碰撞範圍之間額外保留的水平距離。 */
    avoidMargin: 8,
  },

  items: {
    radius: { small: 14, 'orange-small': 14, big: 18, can: 18, chili: 14 },
    scores: { small: 10, 'orange-small': 10, big: 50, can: 100 },
    /** 各種物品相對基本落下速度的倍率；越值錢掉得越快。 */
    fallSpeedScale: { small: 1, 'orange-small': 1, big: 1.15, can: 1.35, chili: 1 },
    maxOnField: 24,
    /** 掉落點與畫面左右邊緣的最小距離。 */
    spawnMargin: 30,
    /** 食物種類權重（辣椒比例另見 difficulty）。 */
    foodWeights: { small: 0.75, big: 0.2, can: 0.05 },
    /** 小魚干轉為橘色變體的機率。 */
    orangeRatio: 0.1,
  },

  /** 由易漸難：依已用時長自 start 線性插值至 end（R7）。 */
  difficulty: {
    spawnInterval: { start: 1.2, end: 0.7 },
    chiliRatio: { start: 0.1, end: 0.2 },
    /** 物品的基本落下速度（像素／秒）。 */
    fallSpeed: { start: 130, end: 210 },
  },

  /**
   * 由高至低比對，取第一個達標的評級（R10）。
   * 模擬 30 回合：黑貓不動時中位數約 960 分；預判落點、會躲辣椒的模擬玩家中位數約 2,280 分。
   */
  grades: [
    { grade: 'S', minScore: 2000 },
    { grade: 'A', minScore: 1600 },
    { grade: 'B', minScore: 1200 },
    { grade: 'C', minScore: 800 },
    { grade: 'D', minScore: 0 },
  ],

  /** y：橘貓探出時的中心高度。 */
  orangeCat: { size: 112, y: 150, enterSeconds: 0.35, holdSeconds: 1.5, leaveSeconds: 0.35 },
  sound: {
    meow: { volume: 0.3, seconds: 0.55 },
    /** 接到食物的提示音。 */
    catch: { volume: 0.16, noteSeconds: 0.12 },
  },
  storageKey: 'jerky-rush:save',
  localeStorageKey: 'jerky-rush:locale',
} as const;

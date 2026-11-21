/** 全部可調遊戲參數的唯一來源（R11）。時間單位為秒，長度單位為競技場像素。 */
export const config = {
  arena: { width: 800, height: 450 },
  roundSeconds: 120,
  lives: 3,
  invulnerableSeconds: 1,

  blackCat: { radius: 24, speed: 260 },
  grayCat: {
    radius: 22,
    /** 相對黑貓速度的倍率。 */
    speedRatio: 0.8,
    /** 前方偵測距離：此距離內的行進路線會擦到辣椒就偏航繞行。 */
    lookahead: 110,
    /** 繞行時與辣椒碰撞範圍之間額外保留的距離。 */
    avoidMargin: 6,
    /** 卡住後改選目標時，路線與辣椒的距離至少要有此值才算可安全抵達。 */
    avoidRadius: 48,
    /** 與目標距離在此時長內沒有縮短 stuckDistance，視為被辣椒卡住。 */
    stuckSeconds: 1.5,
    stuckDistance: 6,
  },

  items: {
    radius: { small: 14, 'orange-small': 14, big: 18, can: 18, chili: 14 },
    scores: { small: 10, 'orange-small': 10, big: 50, can: 100 },
    /** 未撿取的物品存在秒數（R8）。 */
    ttlSeconds: 8,
    /** 消失前開始閃爍的秒數。 */
    blinkSeconds: 2,
    maxOnField: 24,
    /** 生成點與競技場邊緣的最小距離。 */
    spawnMargin: 36,
    /** 生成點與任一貓的最小距離，避免物品直接生在貓身上。 */
    spawnClearance: 90,
    /** 食物種類權重（辣椒比例另見 difficulty）。 */
    foodWeights: { small: 0.75, big: 0.2, can: 0.05 },
    /** 小魚干轉為橘色變體的機率。 */
    orangeRatio: 0.1,
  },

  /** 由易漸難：依已用時長自 start 線性插值至 end（R7）。 */
  difficulty: {
    spawnInterval: { start: 1.2, end: 0.7 },
    chiliRatio: { start: 0.1, end: 0.2 },
  },

  /**
   * 由高至低比對，取第一個達標的評級（R10）。
   * 模擬 40 回合：黑貓不動、只靠灰貓平均約 1,180 分；積極搶分的模擬玩家中位數約 2,400 分。
   */
  grades: [
    { grade: 'S', minScore: 2200 },
    { grade: 'A', minScore: 1800 },
    { grade: 'B', minScore: 1500 },
    { grade: 'C', minScore: 1200 },
    { grade: 'D', minScore: 0 },
  ],

  orangeCat: { size: 112, enterSeconds: 0.35, holdSeconds: 1.5, leaveSeconds: 0.35 },
  meow: { volume: 0.3, seconds: 0.55 },
  storageKey: 'jerky-rush:save',
} as const;

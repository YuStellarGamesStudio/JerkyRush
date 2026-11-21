# 小魚干大作戰｜Jerky Rush

瀏覽器 2D 俯視收集遊戲。玩家操控黑貓，灰貓會自動撿小魚干；兩隻貓要在 120 秒內收集魚獲並避開辣椒。撿到橘色小魚干時，橘貓會跳出來喵一聲。

立即遊玩：<https://jerkyrush.ysgs.app>

## 玩法

- **WASD／方向鍵**：移動黑貓（八方向）。
- **P／Esc**：暫停或繼續；切換到其他視窗時也會自動暫停。
- 分數：小魚干 10、橘色小魚干 10、大魚干 50、魚罐頭 100。
- 灰貓只會追最近的小魚干，並主動繞開辣椒；兩隻貓都能撿任何食物，先碰到的貓撿走。
- 辣椒會讓任一隻貓扣一條命，三條命用完就結束；受擊後有 1 秒無敵時間。
- 物品 8 秒內沒被撿走就會消失；隨著時間推進，出現速度與辣椒比例都會提高。
- 回合結束後顯示總分、S／A／B／C／D 評級與各魚獲數；最佳分數與總回合數存於瀏覽器 localStorage。

所有可調數值（分數、評級線、生成間隔、辣椒比例、速度、無敵時間等）集中於 [`src/config.ts`](src/config.ts)。

## 開發

需要 Node.js ≥22.12 與 pnpm 12.15.0。遊戲引擎為 [XYZ.js](https://github.com/JS-PACKAGE/XYZ.js) `v1.25.0`（commit `63c917aafa17d8704bfb4d4f5ed871a4ed7d6010`）；npm 上沒有發佈，因此先取得指定版本至 `.deps/XYZ.js`，再由 pnpm 以本機連結引入：

```sh
sh scripts/fetch-xyz.sh   # clone v1.25.0 並驗證 commit
pnpm install
pnpm dev                  # 開發伺服器
pnpm test                 # 遊戲邏輯與存檔測試
pnpm build                # 型別檢查後輸出純靜態 dist/
pnpm preview              # 預覽建置結果
```

推送到 `main` 後，[GitHub Actions](.github/workflows/deploy.yml) 會依相同步驟測試、建置，並部署到 GitHub Pages（自訂網域 `jerkyrush.ysgs.app`，經 Cloudflare 代理）。

專案規則與目錄說明見 [`AGENTS.md`](AGENTS.md)，原始企劃與各階段驗收條件見 [`PLAN.md`](PLAN.md)。

## 授權

遊戲原始碼採 [GNU AGPL v3](LICENSE)。[XYZ.js](https://github.com/JS-PACKAGE/XYZ.js) 採 [Apache License 2.0](public/XYZ.js-LICENSE.txt)。

# Jerky Rush 專案規則

- 使用 TypeScript／ESM。先執行 `sh scripts/fetch-xyz.sh` 取得釘選的 XYZ.js，再以 `pnpm install` 安裝、`pnpm dev` 啟動、`pnpm typecheck` 檢查型別、`pnpm test` 執行 `tests/` 內的測試、`pnpm build` 產出 `dist/`。
- 依 [PLAN.md](PLAN.md) 的順序逐一通過 Gate，再進入下一階段。
- XYZ.js 一律透過 `src/engine-adapter.ts` 介接，其他模組不得直接匯入 `xyz.js`。`src/config.ts` 是所有可調遊戲參數的唯一來源。

## 目錄

- `index.html`：瀏覽器入口。
- `src/main.ts`：畫面流程與遊戲主循環的入口。
- `src/config.ts`：可調參數。
- `src/engine-adapter.ts`：XYZ.js 介接邊界。
- `src/game/`：`state.ts` 狀態機、`cats.ts` 輸入與 AI、`spawner.ts` 生成、`scoring.ts` 計分、`timer.ts` 倒數、`orange-cat.ts` 彩蛋。
- `src/art.ts`：角色與物品的 Canvas 2D 程式繪圖；`src/audio.ts`：合成喵聲；`src/save.ts`：本機存檔驗證與讀寫。
- `tests/`：遊戲規則與存檔的 Vitest 測試；`scripts/fetch-xyz.sh`：取得並驗證 XYZ.js；`.github/workflows/deploy.yml`：建置並部署至 GitHub Pages。

## 安全性硬規則

1. 執行期零外部網路請求：遊戲程式不得使用 `fetch`、`XMLHttpRequest` 或 `WebSocket`；所有資產皆本地提供或由程式生成。
2. localStorage 讀取與寫入前均須驗證：`bestScore`、`totalRounds` 必須是非負有限數字；驗證失敗時回預設值 `0`、`0`，不得崩潰。
3. 只在使用者手勢後初始化音訊（開始畫面按鍵或點擊），不得嘗試靜默自動播放。
4. 不包含憑證、個人資料、遙測或日誌上傳。
5. XYZ.js（Apache-2.0）是唯一運行時第三方依賴，來源釘選 Git tag `v1.25.0`；不使用 npm 上的同名套件。
6. 建置僅產出純靜態檔，不含伺服器端程式或密鑰。

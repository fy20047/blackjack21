# Blackjack21 全端專案

本專案用於練習撰寫一個具備瀏覽器 UI 的 21 點遊戲（Blackjack），後端提供回合紀錄、排行榜、管理員登入與訪客統計 API；資料庫使用 Prisma + SQLite。

## 功能總覽
- 遊戲流程：暱稱 → 下注 → 發牌 → 要牌/停牌 → 結算（顯示下注、盈虧、結算後籌碼）。
- 近五戰績：以 Round / Result / Bet / ± / Chips 顯示。
- 籌碼歸零可一鍵「重新開始（100）」，並將 Round 顯示重置為 1。
- 排行榜：前五名（總、日、週、月），首頁展示＋可切換期間。
- 訪客統計：首頁底部顯示累計訪客數。
- 管理後台：
  - 管理員登入/登出（預設 admin/admin1234）。
  - 玩家列表支援名稱搜尋（模糊查詢）。
  - 名稱完全相符時，顯示該玩家最近回合，並可選擇每頁筆數（10/20/50/100）。

## 技術棧
- 前端：原生 HTML/CSS/JS（無框架）
- 後端：Node.js、Express、cookie-parser、cors、dotenv、bcryptjs
- 資料庫：Prisma ORM + SQLite（可改 MongoDB 版本，尚未實作）

## 專案結構
```
D:\\Training\\blackjack21
├─ server
│  └─ index.js            # Express 伺服器與 API 定義
├─ public
│  ├─ index.html          # 首頁（遊戲 + 排行 + 訪客）
│  ├─ admin.html          # 管理後台
│  ├─ app.js              # 前台遊戲邏輯與 API 串接
│  ├─ admin.js            # 後台登入、玩家搜尋、回合列表
│  └─ styles.css          # 全站樣式
├─ prisma
│  └─ schema.prisma       # Prisma 模型定義
├─ package.json           # scripts 與套件
├─ .env.example           # 範例環境變數
└─ README.md
```

## 資料庫模型（Prisma Schema）
- VisitorStat：訪客統計（singleton，id=1）。
- AdminUser：管理員（username 唯一、passwordHash）。
- AdminSession：管理員 Session（token、expiresAt）。
- Player：玩家（username 唯一、maxChips 保存歷史最高籌碼）。
- Round：回合（roundNo、bet、result、delta、chipsAfter、playerId、createdAt）。

> 註：`Round.result` 使用字串（WIN/LOSE/PUSH）。

## 安裝與啟動
需求：Node.js 18+（建議使用 PowerShell 或 VS Code 終端）

1) 建立環境檔並安裝套件
```
Copy-Item -Force .env.example .env
npm install
```

2) 建立資料庫（擇一）
- 推薦（可產出 migration 記錄）
```
npx prisma migrate dev --name init
```
- 或快速同步 schema（開發用）
```
npx prisma db push
```
- 若看到 Prisma Client 缺失，可執行：
```
npx prisma generate
```

3) 啟動伺服器
```
npm run dev   # 開發模式（nodemon）
# 或
npm start     # 一般啟動
```

4) 開啟頁面
- 前台：http://localhost:3000
- 後台：http://localhost:3000/admin（預設：admin / admin1234）

## 環境變數（.env）
- `DATABASE_URL`：SQLite 連線字串（預設 `file:./dev.db`；相對於 prisma 目錄，實際檔案位於 `prisma/dev.db`）
- `PORT`：伺服器埠號（預設 3000）
- `SESSION_COOKIE_NAME`：管理員登入 Cookie 名稱（預設 `admin_session`）
- `SESSION_TTL_HOURS`：管理員 Session 時效（預設 24）
- `ALLOW_ORIGIN`：CORS 設定（預設 `*`）

## 可用 Scripts（package.json）
- `npm run dev`：使用 nodemon 啟動開發伺服器
- `npm start`：啟動伺服器
- `npm run prisma:generate`：產生 Prisma Client
- `npm run prisma:migrate`：建立 migration（`prisma migrate dev --name init`）
- `npm run prisma:studio`：開啟 Prisma Studio

## API 一覽
- 訪客統計
  - `GET /api/visitor` → `{ total }`
  - `POST /api/visitor/hit` → `{ total }`（累計 +1）
- 管理員
  - `POST /api/admin/login`：登入（body: `{ username, password }`），設置 httpOnly Cookie
  - `POST /api/admin/logout`：登出（清除 Cookie）
  - `GET /api/admin/players?search=...`：玩家列表（模糊搜尋 username）
  - `GET /api/admin/rounds?username=...&limit=...`：當 `username` 完全相符時，回傳該玩家最近回合；未提供時回傳空陣列
- 回合紀錄
  - `GET /api/rounds?username=...&limit=5`：取得玩家最近回合
  - `POST /api/rounds`：寫入回合紀錄並檢查是否更新 `Player.maxChips`
    - body: `{ username, roundNo, bet, result, delta, chipsAfter }`
- 排行榜
  - `GET /api/leaderboard?period=all|day|week|month`：
    - all：依 `Player.maxChips` 取前 10，並回傳前 5
    - 其他期間：統計區間內各玩家 `chipsAfter` 的最大值排序

## 前端使用說明
- 首頁（index.html）
  - 遊戲：下注 → 發牌 → 要牌/停牌 → 結算，顯示結算橫幅（勝/敗/平）
  - 近五戰績：自後端撈取該暱稱最近 5 回合
  - 排行榜：可切換總/日/週/月；前五名顯示
  - 訪客統計：頁尾顯示累計
  - 重新開始：籌碼歸零時出現，按下後籌碼=100、回合=1、清空近五戰績
  - 登出：清空使用者本機狀態，回到暱稱輸入畫面
- 後台（admin.html）
  - 登入/登出（httpOnly Cookie 維持 Session）
  - 玩家列表（可搜尋）
  - 完全相符的名稱 → 顯示該玩家最近回合，支援每頁 10/20/50/100 筆

<!-- ## 常見問題（FAQ）
- 埠號被占用：修改 `.env` 的 `PORT` 後重新啟動。
- Prisma 指令失敗：先執行 `npx prisma generate`，再 `migrate dev` 或 `db push`。
- 看不到回合紀錄：請確認搜尋的玩家名稱是否與實際完全相符（後台僅在完全相符時顯示回合）。

## 後續可延伸
- Blackjack 3:2、保險、分牌、雙倍下注等規則
- 玩家登入制與持久化籌碼（而非本地狀態）
- MongoDB 版本的資料層實作
- 後台報表、匯出 CSV、更多搜尋條件 -->


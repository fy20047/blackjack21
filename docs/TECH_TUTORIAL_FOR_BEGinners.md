# 初學者技術教材（依本專案所用技術分段說明）

本教材幫助沒有基礎的新手快速上手，採用「概念 → 最小範例 → 與本專案的對應」的方式，涵蓋 HTML/CSS、JavaScript、瀏覽器 API、Node/Express、REST/HTTP、Cookie/Session、Prisma/SQLite、CORS、NPM 等。

---

## 1) HTML 與 DOM（結構）
- 觀念：HTML 決定「有哪些區塊/元素」，瀏覽器讀取後形成 DOM 樹（可用 JS 讀/改）。
- 範例：
```
<!doctype html>
<html lang="zh-Hant">
  <head>
    <meta charset="utf-8" />
    <title>Example</title>
  </head>
  <body>
    <h1 id="title">Hello</h1>
    <button id="btn">Click</button>
  </body>
  </html>
```
- 在本專案：
  - 使用者端頁面：`public/index.html`（遊戲、排行榜、訪客統計）
  - 管理端頁面：`public/admin.html`（登入、玩家列表、回合與分頁）

## 2) CSS（樣式）
- 觀念：CSS 決定「長什麼樣子」，可用類別（class）或 ID 選擇器套用樣式。
- 常用：盒模型、顏色、字體、Flex/Grid 版面、變數（:root）。
- 範例（主題變數 + Flex）：
```
:root { --accent:#65a9ff }
.header { display:flex; justify-content:space-between }
button { background:var(--accent); border:0; color:#071225 }
```
- 在本專案：`public/styles.css` 使用變數、Flex/Grid、客製下拉選單、結算橫幅配色（win/lose/push）。

## 3) JavaScript 基礎（語言）
- 變數：`const`（不可重新指派）、`let`（可重新指派）。
- 型別：字串、數字、布林、陣列、物件、undefined、null。
- 函式：
  - 宣告式：`function add(a,b){ return a+b }`
  - 箭頭式：`const add = (a,b) => a+b`
- 範圍（Scope）：`const/let` 以區塊為範圍；避免使用舊的 `var`。
- 模板字串：`` `Hi ${name}` ``
- 解構：`const {x,y} = obj`、`const [a,b] = arr`
- 在本專案：
  - 前端主邏輯：`public/app.js` 管理狀態、流程與 API 串接
  - 後台邏輯：`public/admin.js` 登入、搜尋、分頁

## 4) 瀏覽器 API（DOM、事件、localStorage、fetch）
- DOM 操作：`document.getElementById('id')` 取得元素，改 `textContent/innerHTML/classList`。
- 事件：`el.addEventListener('click', handler)` 綁定按鈕行為。
- localStorage：`setItem/getItem` 存字串（可用 JSON 序列化物件）。
- fetch：發 HTTP 請求；常用 JSON：
```
const res = await fetch('/api', {
  method:'POST',
  headers:{'Content-Type':'application/json'},
  body: JSON.stringify({ a:1 }),
  credentials:'include' // 帶上 Cookie（如後台登入）
});
const data = await res.json();
```
- 在本專案：
  - `app.js` 用 fetch 打 `/api/rounds`、`/api/leaderboard`、`/api/visitor`，並用 localStorage 保存 username/chips/roundNo。
  - `admin.js` 用 fetch 打 `/api/admin/*` 與 `/api/admin/rounds`（帶 Cookie）。

## 5) Node.js 與 Express（後端）
- Express：輕量後端框架；路由處理請求；中介層處理通用邏輯（CORS、JSON、Cookie）。
- 最小範例：
```
const express = require('express');
const app = express();
app.use(express.json());
app.get('/hello', (req,res)=> res.json({hi:'world'}));
app.listen(3000);
```
- 中介層（Middleware）：`app.use(fn)`，如 `cors()`、`cookieParser()`、驗證 Session。
- 在本專案：`server/index.js`
  - CORS/JSON/Cookie 中介層、靜態檔（public/）
  - API 路由：訪客統計、回合紀錄、排行榜、管理員登入/登出、後台查詢

## 6) REST 與 HTTP（介面規範）
- Method：GET（讀）、POST（新建）、PUT/PATCH（更新）、DELETE（刪）。
- 狀態碼：200 成功；400 參數錯；401 未授權；500 伺服器錯。
- JSON：請求與回應以 JSON 為主，便於前後端互通。
- 在本專案：所有 API 都用 JSON 與這套方法/狀態碼。

## 7) Cookie 與 Session（登入）
- Cookie：瀏覽器隨請求夾帶的小資料（key/value）。
- httpOnly：前端 JS 讀不到（更安全）。
- Session：伺服器端記錄的登入狀態（本專案用 DB 表 `AdminSession`）。
- 流程：登入 → 伺服器建立 Session 並發 httpOnly Cookie → 後台 API 驗證 Cookie → 登出刪除 Session。
- 在本專案：`/api/admin/login|logout`、中介層 `requireAdmin`、`AdminSession` 表。

## 8) Prisma 與 SQLite（資料層）
- Prisma：ORM，把資料表映射為程式可呼叫的 API；Schema 決定資料表長相；Client 是程式的查詢工具。
- SQLite：單檔案 SQL 資料庫，輕量、適合開發。
- 指令：
  - 產生 Client：`npx prisma generate`
  - 建遷移/建表：`npx prisma migrate dev --name init`
  - 快速同步：`npx prisma db push`
- Query 範例：
```
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const players = await prisma.player.findMany({ orderBy:{ maxChips:'desc' }, take:10 });
```
- 在本專案：
  - Schema：`prisma/schema.prisma` 定義 VisitorStat/AdminUser/AdminSession/Player/Round
  - 查詢：`server/index.js` 內 `prisma.xxx.findMany/create/update/groupBy`
  - DB 檔案：`.env` 設 `DATABASE_URL="file:./dev.db"` → 實際為 `prisma/dev.db`

## 9) CORS（跨來源）
- 觀念：瀏覽器的安全規則；若前端與後端不同來源，需要伺服器允許跨來源。
- 設定：
```
const cors = require('cors');
app.use(cors({ origin: '*', credentials:true }));
```
- 在本專案：`server/index.js` 依 `.env` 的 `ALLOW_ORIGIN` 動態允許來源並開啟 `credentials`。

## 10) NPM 與 Scripts（開發工具）
- `npm install` 安裝依賴。
- Scripts（`package.json`）：
  - `npm run dev` 啟動開發伺服器（nodemon 自動重啟）。
  - `npm start` 正式啟動。
  - `npm run prisma:generate/migrate/studio` Prisma 相關工具。

## 11) 安全基礎（bcrypt 雜湊、輸入驗證）
- bcrypt：密碼雜湊（單向，不可還原），登入時用 `compare` 做驗證。
- 輸入驗證：後端檢查必填欄位與格式（例如回合 result 僅允許 WIN/LOSE/PUSH）。
- 在本專案：`/api/admin/login` 用 `bcrypt.compare`，`/api/rounds` 驗證欄位與 result 值。

## 12) 分頁與排行（查詢設計）
- 分頁：常見 `skip`/`take`（或 SQL 的 OFFSET/LIMIT），搭配 `count` 計算總頁數。
- 排行：全時以 `player.maxChips` 排序；期間用 `round.groupBy` 取 `_max.chipsAfter`。
- 在本專案：`/api/admin/rounds` 回 `{ rounds, total, page, limit }`；`/api/leaderboard` 實作兩種排行邏輯。

---

## 實作導引（把觀念連起來）
- 流程一：玩家玩一局
  1) 前端（app.js）下注/發牌 → 要/停 → 結算。
  2) 結算呼叫 `POST /api/rounds`，後端寫入 Round，必要時更新 Player.maxChips。
  3) 前端再拉近五戰績與排行榜更新畫面。
- 流程二：管理員查資料
  1) 登入（httpOnly Cookie session）。
  2) 玩家列表（模糊搜尋）。
  3) 名稱完全相符時載入該玩家回合（分頁）。

## 小練習（動手做）
- A. 在前端加一個「切換牌面樣式」按鈕（CSS class 切換）。
- B. 在後端 `/api/rounds` 新增一個欄位（例如 `notes`），並在前端結算時一併送出與顯示。
- C. 為 `/api/leaderboard` 增加 `year` 期間，並在前端下拉加入該選項。

---

需要更進一步的教材（如更完整的 JS/Express/Prisma 入門課程、或 Postman/VSCode REST Client 的 API 測試指南），告訴我即可加上對應章節與範例。

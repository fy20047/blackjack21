# 新手筆記：語法與技術速讀

本筆記協助初學者快速建立「語法」與「技術」的整體地圖，配合本專案就能理解程式彼此如何合作。

## 1) JavaScript（Node 與瀏覽器）
- 變數：`const`（常量）、`let`（可重新指定）。避免使用 `var`（舊語法）。
- 型別：字串（String）、數字（Number）、布林（Boolean）、物件（Object）、陣列（Array）、null/undefined。
- 函式：
  - 宣告式：`function f(x) { return x+1 }`
  - 箭頭式：`const f = (x) => x+1`
- 模組：
  - Node（CommonJS）：`const x = require('x')`
  - ESM：`import x from 'x'`（本專案採 CommonJS）
- 非同步：`async/await`（搭配 `try/catch`），例如：
  ```js
  async function run(){
    try{ const data = await fetch('/api').then(r=>r.json()) } catch(e){ console.error(e) }
  }
  ```
- 瀏覽器 DOM：`document.getElementById('id')` 取元素；`addEventListener('click', handler)` 綁事件。
- 儲存：`localStorage.setItem/getItem` 存小量設定（字串）。

## 2) Node.js + Express（後端）
- Express：輕量 Web 框架。
  - 中介層（middleware）：`app.use(cors())`、`app.use(express.json())`、`app.use(cookieParser())`
  - 路由：`app.get('/path', handler)`、`app.post('/path', handler)`
  - handler：`(req, res) => { ...; res.json({...}) }`
- CORS：跨來源資源分享。瀏覽器的安全限制需由伺服器宣告允許哪些來源、是否允許帶 Cookie。
- Cookie：
  - httpOnly：JS 無法讀取，降低被 XSS 竊取風險。
  - SameSite/secure：控制跨站行為與是否僅用 https。

## 3) HTTP 與 REST API
- Method：GET（讀）、POST（新建）、PUT/PATCH（更新）、DELETE（刪）。
- 狀態碼：200 成功；400 參數錯；401 未授權；500 伺服器錯。
- JSON：以 `res.json({ ... })` 回應；前端以 `fetch(...).then(r=>r.json())` 解析。

## 4) 資料庫與 Prisma（ORM）
- SQLite：單一檔案的關聯式資料庫（ACID），開發期輕量好用；本案檔案在 `prisma/dev.db`。
- Prisma：ORM，把資料表映射成程式可呼叫的 API：`prisma.player.findMany()`。
- schema.prisma：定義模型（等於表結構），例如：
  ```prisma
  model Player { id Int @id @default(autoincrement()) username String @unique maxChips Int @default(100) createdAt DateTime @default(now()) rounds Round[] }
  ```
- 常見註記：`@id` 主鍵、`@default()` 預設值、`@unique` 唯一鍵、`@relation` 關聯、`@@index` 索引。
- 指令：
  - 產生 Client：`npx prisma generate`
  - 建立/套用遷移：`npx prisma migrate dev --name init`
  - 開發快速同步：`npx prisma db push`

## 5) 認證與 Session（本專案）
- 流程：登入時驗證帳密 → 產生隨機 token → 寫入 `AdminSession` 表 → 設置 httpOnly Cookie。
- 後台 API：以中介層 `requireAdmin` 檢查 Cookie 的 token 是否有效與未過期。
- 好處：可控與可撤銷（刪除 Session 即失效）。

## 6) 前端遊戲流程（本專案）
- 狀態保存：`username/chips/roundNo` 放 localStorage，重整不丟。
- 下注 → 發牌 → 要牌/停牌 → 結算：
  - 結算時 `POST /api/rounds` 寫 DB；同步更新近五戰績與排行榜。
  - ALL IN：快速把下注金額設為現有籌碼。
  - 重新開始：chips=100、round=1（清空近五戰績表格顯示）。

## 7) SQL vs NoSQL（為何本案選 SQLite/SQL）
- SQL（本案）：
  - 優：關聯清楚（Player ⟷ Round）、查詢/彙總能力強（groupBy 排行）、一致性保證好。
  - 適：排行榜、搜尋、分頁、唯一鍵等需求明確的資料。
- NoSQL（如 MongoDB）：
  - 優：文件模型彈性高、水平擴充友善。
  - 適：結構變化大、超大規模分散式；本案也可以換 datasource 成 MongoDB（需要調整聚合方式）。

## 8) 開發工具與常見指令
- 啟動開發伺服器：`npm run dev`
- 正式啟動：`npm start`
- 產生 Prisma Client：`npx prisma generate`
- 遷移/建表：`npx prisma migrate dev --name init`
- 快速同步 Schema：`npx prisma db push`
- 檢視資料：`npx prisma studio`

## 9) 小心事項
- `.env` 含機敏資訊（已被 .gitignore 忽略）；分享設定請用 `.env.example`。
- SQLite 僅適合個人與開發；上線可改用 Postgres/MySQL（Prisma 可平滑切換 provider）。
- httpOnly Cookie 不會被 JS 存取，無法用前端讀取；以後端驗證為主。

---
有需要我可把這份筆記拆成多個主題頁（JS/Express/Prisma/DB/安全性/HTTP），並補上圖解與簡單練習題。

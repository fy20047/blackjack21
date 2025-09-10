# .env.example 行內導讀（逐行說明）

- L1：註解：說明 `DATABASE_URL` 用於 SQLite 連線字串，預設 `file:./dev.db`（相對於 prisma 目錄）。
- L2：空行。
- L3：`PORT=3000` 伺服器監聽埠號（可改）。
- L4：空行。
- L5：註解：管理員 Session Cookie 設定。
- L6：`SESSION_COOKIE_NAME=admin_session` Cookie 名稱（前端無需知道內容，httpOnly 由伺服器讀取）。
- L7：`SESSION_TTL_HOURS=24` Session 有效時間（小時）。
- L8：空行。
- L9：註解：`ALLOW_ORIGIN=*` CORS 允許來源；若只允許單一網域，改成該網域即可（例如 `http://localhost:3000`）。

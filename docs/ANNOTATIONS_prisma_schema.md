# prisma/schema.prisma 行內導讀（逐行說明）

- L1：文件註解：說明此 generator 會產生 Prisma Client（JS 版本）。
- L2–L4：`generator client { provider = "prisma-client-js" }` 指定要產生的客戶端實作。
- L6：文件註解：說明資料來源設定。
- L7–L10：`datasource db` 指定使用 SQLite，連線字串來自 `env("DATABASE_URL")`。
- L12：文件註解：VisitorStat 模型說明。
- L13：`id Int @id @default(1)` 主鍵 id，預設為 1（單筆統計）。
- L14：`total Int @default(0)` 訪客累計次數，預設 0。
- L15：`updatedAt DateTime @updatedAt` 自動更新時間戳記。
- L18：AdminUser 模型說明。
- L19：`id Int @id @default(autoincrement())` 主鍵遞增。
- L20：`username String @unique` 管理員帳號，唯一鍵。
- L21：`passwordHash String` 雜湊過的密碼字串。
- L22：`createdAt DateTime @default(now())` 建立時間。
- L23：`sessions AdminSession[]` 一對多關聯，對應多個 Session。
- L26：AdminSession 模型說明。
- L27：`id Int @id @default(autoincrement())` 主鍵遞增。
- L28：`token String @unique` 唯一的 session token。
- L29–L30：`admin AdminUser @relation(...); adminId Int` 關聯至 AdminUser（外鍵欄位 `adminId`）。
- L31：`createdAt DateTime @default(now())` 建立時間。
- L32：`expiresAt DateTime?` 逾期時間（可為空）。
- L35：Player 模型說明。
- L36：`id Int @id @default(autoincrement())` 主鍵遞增。
- L37：`username String @unique` 玩家名稱，唯一鍵。
- L38：`maxChips Int @default(100)` 玩家歷史最高籌碼，預設 100。
- L39：`createdAt DateTime @default(now())` 建立時間。
- L40：`rounds Round[]` 一對多關聯，對應多局回合。
- L43：Round 模型說明。
- L45：`id Int @id @default(autoincrement())` 主鍵遞增。
- L46：`roundNo Int` 回合編號（前端顯示與統計用）。
- L47：`bet Int` 本局下注。
- L48：`result String` 結果字串（WIN/LOSE/PUSH）。
- L49：`delta Int` 盈虧（贏 +bet、輸 -bet、平 0）。
- L50：`chipsAfter Int` 結算後籌碼。
- L51：`createdAt DateTime @default(now())` 建立時間。
- L53–L54：`player Player @relation(...); playerId Int` 關聯至 Player（外鍵欄 `playerId`）。
- L56：`@@index([playerId, createdAt])` 複合索引：常見查詢為「某玩家的最近回合」，此索引能加速。

備註：SQLite 不支援 Prisma enum，故 `result` 為 String；若日後換 PostgreSQL，可改為 enum 類型並遷移。

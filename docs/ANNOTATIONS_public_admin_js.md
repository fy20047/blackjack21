# public/admin.js 行內導讀（逐行說明）

- L1–L5：宣告 `fetchJSON`，共用的 HTTP 請求包裝器。固定帶上 `credentials:'include'`（讓瀏覽器夾帶 httpOnly Cookie）與 JSON 標頭；非 2xx 會丟出錯誤字串。
- L7：小工具 `el(id)`，等同 `document.getElementById(id)`。
- L9–L15：宣告 `pager` 分頁狀態：`currentPage` 目前頁、`total` 總筆數、`limit` 每頁筆數、`username` 當前查詢的玩家。
- L17–L29：`async function login()` 後台登入流程：讀取輸入框 username/password，呼叫 `POST /api/admin/login`；成功後隱藏登入面板、顯示後台面板，並載入玩家列表與最近回合；失敗彈出警示。
- L31–L37：`async function logout()` 後台登出：呼叫 `POST /api/admin/logout`（失敗也忽略），然後切回登入面板。
- L39–L54：`async function refreshPlayers()` 載入玩家列表：
  - L40：讀取搜尋框字串（去除頭尾空白）。
  - L42：呼叫 `GET /api/admin/players?search=...`（若空字串則不附加參數）。
  - L43–L49：清空 `#playersBody`，將每位玩家以一列 `<tr>` 顯示 `username/maxChips/createdAt`。
  - L50–L53：若搜尋字串與某位玩家名稱「完全相符」，設定 `pager.username` 為該名稱，並將 `currentPage` 重置為 1，再呼叫 `refreshRounds()` 載入該玩家的最近回合。
- L56–L82：`async function refreshRounds(username)` 依玩家名稱載入最近回合（需完全相符才顯示）：
  - L58–L61：先清空回合表與標題；若 `username` 無值直接返回（不顯示）。
  - L64：從下拉 `#pageSize` 取得每頁筆數並寫入 `pager.limit`。
  - L65：呼叫 `GET /api/admin/rounds?username=...&limit=...&page=...` 取得 `{ rounds, total, page, limit }`。
  - L66–L70：更新 `pager.total/currentPage`，計算總頁數 `totalPages`，清空表身。
  - L71：標題顯示「玩家：username，共 total 筆」。
  - L72–L76：逐列插入回合資料：玩家名、回合編號、下注、結果、盈虧、結算後籌碼、建立時間。
  - L77–L80：更新分頁 UI：頁次顯示文字與上一頁/下一頁按鈕的可用狀態。
- L84–L91：事件綁定（登入、登出、搜尋、每頁筆數改變）。更換每頁筆數時會重新呼叫 `refreshPlayers()`，它會重置到第 1 頁並刷新回合。
- L93–L106：分頁按鈕事件：
  - `prevPage`：若不是第 1 頁，就 `currentPage -= 1` 後刷新回合。
  - `nextPage`：若未達最後一頁，就 `currentPage += 1` 後刷新回合。

備註：所有後台 API 皆需登入（由伺服器端 `requireAdmin` 中介層驗證 httpOnly Cookie 的 session token）。

# public/index.html 行內導讀（逐行說明）

- L1：文件型別宣告（HTML5）。
- L2：`<html lang="zh-Hant">` 頁面語系（繁體中文）。
- L3–L8：`<head>` 區塊：編碼（UTF-8）、響應式視窗、標題、連結全站樣式 `styles.css`。
- L9：`<body>` 開始。
- L10–L16：頁首 `<header.header>`：標題與右上導覽連結（管理後台）。
- L18–L32：排行榜區 `<section.leaderboard>`：
  - L20–L21：標題「前五名玩家」。
  - L22–L29：期間選單 `<select id="periodSelect">`（總/今日/本週/本月）。
  - L31：前五名清單 `<ol id="top5">` 由前端插入 `<li>`。
- L35–L41：登入面板（輸入玩家暱稱） `<div#loginPanel.panel>`：輸入框 `#usernameInput` 與按鈕 `#startBtn`。
- L42：遊戲面板（預設隱藏） `<div#gamePanel.panel.hidden>`。
- L44–L49：玩家資訊列 `<div.player-info>`：顯示玩家名 `#playerName`、籌碼 `#chips`、登出按鈕 `#logoutPlayerBtn`、重新開始按鈕 `#resetBtn`。
- L51：目前回合指示 `<div.round-indicator>...<strong id="roundNo">`。
- L53–L58：下注列 `<div#bettingPanel>`：標籤、數字輸入 `#betInput`、ALL IN 按鈕 `#allInBtn`、發牌 `#dealBtn`。
- L61–L72：桌面 `<div.table>`：
  - 莊家區：手牌容器 `#dealerHand`、分數 `#dealerScore`。
  - 玩家區：手牌容器 `#playerHand`、分數 `#playerScore`。
- L75–L78：操作列 `<div#actions>`（初始隱藏）：要牌 `#hitBtn`、停牌 `#standBtn`。
- L80：結算橫幅 `#banner`（初始隱藏）。
- L82–L90：近五戰績 `<div.recent>`：表格 `#recentBody` 由前端插入列。
- L92：結束遊戲面板。
- L95–L99：頁尾 `<footer.footer>`：訪客統計 `#visitorCount` 與版權文字。
- L101：載入前端主腳本 `/app.js`。
- L102–L103：關閉 `</body></html>`。

備註：所有資料內容由 `public/app.js` 動態填入（如排行榜、戰績、分數、手牌）。

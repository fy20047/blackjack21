# public/styles.css 行內導讀（逐行說明）

- L1：區塊註解，描述全站主題變數區。
- L2–L11：`:root` CSS 變數：背景、面板、文字/輔助色、強調色、勝/敗/平三色。
- L13：萬用選擇器 `*` 設定 `box-sizing: border-box`，讓寬高計算包含內距與邊框。
- L15：`body` 基本字體、背景色與文字色。
- L16：`.header, .footer` 共同樣式：左右排列、上下置中、背景與邊框線。
- L18：`.header a` 連結為白字、粗體，不加底線；
- L19：`.header a:hover` 滑過加底線。
- L20：`.footer` 置底、上邊框、水平間距。
- L21：`.spacer` 彈性空白，用於推開內容。
- L23：`.leaderboard, .game .panel` 區塊框：最大寬度、圓角、描邊與背景。
- L24：`.leaderboard-header` 水平排列、間距。
- L25：`ol#top5` 左縮排調整。
- L28：`.select` 為自訂下拉容器（相對定位）。
- L29：`.select select` 隱藏原生外觀、設定內距/圓角/邊框/顏色。
- L30：`.select::after` 加上向下箭頭符號（▾），並絕對定位在右側中間。
- L32：`.panel.hidden, .hidden` 共用隱藏類別（`display: none`）。
- L33：`.player-info` 玩家資訊列：水平排列、左右分散。
- L34：`.secondary` 次要按鈕樣式：透明底、細框、圓角、游標。
- L35：`button` 主要按鈕樣式：強調色底、圓角、粗體字。
- L36：`input` 輸入框樣式：圓角、深色底、描邊。
- L39：`.table` 以 CSS Grid 建兩欄牌桌，水平間距 16px。
- L40：`.hand` 單側手牌框：深底、描邊、圓角、內距。
- L41：`.cards` 牌容器：水平排列、卡片間距、垂直置中。
- L42：`.card` 卡片尺寸、圓角、邊框、背景與字體。
- L43：`.card.back` 背面卡片（深色），文字同色做隱藏。
- L44：`.score` 分數文字，較小與輔助色。
- L46：`.actions` 動作列：按鈕間距。
- L48：`.banner` 結算橫幅外觀（圓角、內距、粗體）。
- L49–L51：三種結果配色（win/lose/push）。
- L53：`.recent table` 近戰績表格寬度 100%，邊框摺疊。
- L54：`.recent th, .recent td` 下框線與內距、左對齊。
- L57：`.round-indicator` 回合指示的字型大小與顏色。

備註：若要做行動版最佳化，可在底部補上 `@media (max-width: 600px) { ... }` 針對表格、牌面縮放。

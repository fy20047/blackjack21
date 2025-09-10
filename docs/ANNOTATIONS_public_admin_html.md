# public/admin.html 行內導讀（逐行說明）

- L1：HTML5 doctype。
- L2：`<html lang="zh-Hant">` 指定語系。
- L3–L7：`<head>`：編碼、響應式、標題、連結共用樣式。
- L8–L15：頁面內嵌 `<style>`：後台頁面的局部樣式（容器、列、表格、登入區）。
- L17–L24：頁首 `<header.header>`：標題與返回首頁連結。
- L27：後台主體 `<section.admin>`。
- L28–L34：登入面板 `#authPanel`：包含使用者/密碼輸入框與登入按鈕。
- L36：管理面板 `#adminPanel`（初始為 `.hidden`）。
- L37–L49：上方工具列：登出按鈕、搜尋輸入框、搜尋按鈕、每頁筆數下拉（10/20/50/100）。
- L51–L55：玩家列表表格，表身 `#playersBody` 由前端插入列。
- L57：小標題「最近回合」，標題旁顯示 `#roundsTitle`（玩家名稱與總筆數）。
- L58–L62：分頁列：上一頁 `#prevPage`、頁次顯示 `#pageInfo`、下一頁 `#nextPage`。
- L63–L66：回合表格，表身 `#roundsBody` 由前端插入列。
- L70：載入後台腳本 `/admin.js`。
- L71–L72：結束 `<body></html>`。

備註：登入成功後以 httpOnly Cookie 維持管理員 Session；前端的 `admin.js` 負責所有互動與資料載入。

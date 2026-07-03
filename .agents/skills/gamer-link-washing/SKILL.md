---
name: gamer-link-washing
description: 規範與指引巴哈姆特動畫瘋及 ACG 百科連結的爬取、檢驗、洗滌與比對規則，確保防止跨季誤抓與無關作品錯誤綁定。
---

# 巴哈姆特動畫瘋網址洗滌與檢驗規範 (Gamer Link Washing Skill)

當處理、修復、洗滌或新增巴哈姆特 (Gamer / 動畫瘋) 播放連結與 ACG 百科連結時，**必須嚴格遵守以下四項核心規則**，確保所有動畫作品（特別是多季作品與未開播新番）的網址準確率維持 100%。

---

## 1. 黃金權威優先原則 (bangumi-data ACG 百科優先)
在驗證任何 AniList 項目對應的巴哈授權連結時，**務必優先查詢並下載開源專案 `bangumi-data` 官方字典檔**，以取得該項目對應的巴哈姆特 ACG 百科官方頁面 URL（格式：`https://acg.gamer.com.tw/acgDetail.php?s=XXXXXX`）。
該 ACG 百科連結為資料庫對齊與驗證的第一權威基準。

---

## 2. 繁中標題優先校正與播放頁提取規則 (絕不盲目搜尋)
對已確認的 ACG 百科頁面 URL 進行 HTTP 請求與 HTML 解析 (`resolveGamerInfo`) 時：
- **第一件事（繁中標題優先同步）**：進到百科頁面後的**第一件事**，必須讀取該頁面的主標題 (`<h1>`)，並優先將該作品在系統庫與 `custom_override.json` 中的**繁體中文翻譯 (`titleZh`) 覆蓋更新為巴哈百科上的官方翻譯**。
- **直接提取播放頁**：若 HTML 頁面內包含指向 `ani.gamer.com.tw` 的播放頁面連結（例如 `animeVideo.php?sn=` 或 `animeRef.php?sn=`），**必須直接提取並採用該播放頁面連結**作為最終授權 URL。
- **嚴禁盲目搜尋**：只要 ACG 百科頁面上已有播放頁連結，**絕對禁止再去動畫瘋使用標題關鍵字進行搜尋**。
  - *原因*：巴哈姆特動畫瘋搜尋列表 (`search.php`) 預設將最新更新的季度（如第二季）排在最頂端。若盲目拿第一季標題去搜尋並直接取第一筆，會導致所有第一季作品全數被錯誤覆蓋為第二季。

---

## 3. 80% 相似度檢驗與防呆還原規則 (嚴禁模糊誤抓)
當 ACG 百科頁面內**無動畫瘋播放連結**（例如未來的夏季/秋季新番尚未開播上架），或根本無 ACG 百科紀錄而不得已必須啟動標題搜尋 (`resolveGamerStreamingUrl` / `searchGamerSingle`) 時：
1. **嚴格禁止截斷搜尋**：**絕對禁止**截取標題前 N 個字元（如前 6 字）丟給搜尋引擎進行模糊比對，避免嚴重誤抓（如「闇黑燈火」被前 6 字誤抓為「黑貓與魔女的教室」）。
2. **80% 相似度門檻**：搜尋引擎回傳的所有候選項目標題 (`.theme-name`)，必須與待查詢目標標題進行 **Bigram / Dice's Coefficient 相似度比對 (`calculateTitleSimilarity`)**。
3. **低於 80% 一律拋棄並還原**：
   - 若候選結果中最高相似度達到 **80% (0.8) 以上**，方可採用該播放連結。
   - 若所有結果相似度皆 **低於 80%**，**必須立刻拋棄搜尋結果，還原並保留原本的 ACG 百科頁面 URL (`acgDetail.php?s=XXXXXX`)**。

---

## 4. 標題翻譯資料優先度順序 (Title Translation Priority Hierarchy)
系統處理繁體中文標題 (`titleZh`) 時，採嚴格的降冪優先度順序，高優先度標題將無條件覆蓋低優先度標題：
1. **Priority 1 (最高權威)**：**巴哈姆特 ACG 百科官方標題 (`source: 'gamer'`)** 或 **人工設定校正 (`custom_override.json`)**。進到百科頁面抓取到的 H1 標題位列此層級。
2. **Priority 2**：**`bangumi-data` 社區開源對照字典 (`zh-Hant` / `zh-Hans`)**。
3. **Priority 3**：**ACG Secrets (`acgsecrets.hk`)** 季節新番標題對照。
4. **Priority 4 (最低權威)**：**AI 自動翻譯 (`source: 'ai'`)**。僅在上述所有官方/字典來源皆不可得時採用，且一旦取得前三者之一便立刻被覆蓋。

---

## 5. 防呆與防護攔截過濾 (Anti-Crawling & Maintenance Protection)
當請求巴哈姆特 ACG 百科或動畫瘋時，若遭遇雲端防護、網路攔截或系統維修，**必須啟動嚴密過濾，嚴禁將異常字串誤設為動畫標題或 URL**：
- **阻擋關鍵字清單**：`['系統維修', '系統維護', 'Cloudflare', '請稍後', '巴哈姆特', 'Forbidden', '發生錯誤', 'Access Denied', '驗證碼', '注意力檢查']`
- **防呆判斷**：
  1. 若 HTTP Status Code 為 `403` 或 `503`。
  2. 若 HTML 內文或頁面標題 (`<h1>` / `<title>`) 包含上述任一**阻擋關鍵字**。
- **處置動作**：立即標示為 `isBlocked: true` 並印出警告，**拋棄本次請求取得的所有內容，保持原有的標題與 URL 不變**，防範任何污染寫入資料庫。

---

## 6. 每日排程同步與架構落地
本規範已標準化整合至核心模組：
- `scraper/scraper_utils.mjs`: 實作 `calculateTitleSimilarity` 與防護攔截字庫過濾。
- `scraper/wash_gamer_links.mjs`: 實作 `bangumi-data` 字典優先載入與繁中標題第一優先同步。
- 每日自動化排程 `daily_runner.mjs` 每日運行 `anime_crawler.js` 時，將全自動執行本套一致性規則，保證資料庫長久清潔準確。

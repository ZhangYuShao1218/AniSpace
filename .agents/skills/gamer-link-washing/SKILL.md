---
name: gamer-link-washing
description: 規範與指引巴哈姆特動畫瘋及 ACG 百科連結的爬取、檢驗、洗滌與比對規則，確保防止跨季誤抓與無關作品錯誤綁定。
---

# 巴哈姆特動畫瘋網址洗滌與檢驗規範 (Gamer Link Washing Skill)

當處理、修復、洗滌或新增巴哈姆特 (Gamer / 動畫瘋) 播放連結與 ACG 百科連結時，**必須嚴格遵守以下核心規則與三階段比對邏輯**，確保所有動畫作品（特別是多季作品與未開播新番）的網址準確率維持 100%。

---

## 1. 黃金權威優先與三階段精確對應原則 (`matchBangumiItem`)
在驗證任何 AniList 項目對應的巴哈授權連結與 ACG 百科時，**務必優先查詢並下載開源專案 `bangumi-data` 官方字典檔**，以取得該項目對應的巴哈姆特 ACG 百科官方頁面 URL（格式：`https://acg.gamer.com.tw/acgDetail.php?s=XXXXXX`）。

為避免單一 ID 缺失或改名導致漏抓，所有模組（爬蟲、洗滌、稽核）在對齊 AniList 與 bangumi-data 時，必須透過 `scraper/scraper_utils.mjs` 中的 `matchBangumiItem` 執行**三階段優先序比對**：
1. **優先序 A：AniList ID 精確對照**（查詢 `sites` 中的 aniList ID）。
2. **優先序 B：人工指定標題對照**（讀取 `custom_override.json` 中的 `bangumiDataTitle` 欄位與 bangumi-data 進行精確比對）。
3. **優先序 C：100% 日文標題精確對照**（AniList 的 `titleJa` 與 bangumi-data 的日文標題完全相等）。

> [!NOTE]
> 每次爬蟲或更新時，系統會自動將完整的 `bangumi-data` 下載並備份至 `public/bangumi_data.json`，並隨 CI/CD 自動提交至 GitHub Repo，方便隨時進行人工對照與審閱。

---

## 2. 繁中標題優先校正與播放頁提取規則 (絕不盲目搜尋)
對已確認的 ACG 百科頁面 URL 進行 HTTP 請求與 HTML 解析 (`resolveGamerInfo`) 時：
- **第一件事（繁中標題優先同步）**：進到百科頁面後的**第一件事**，讀取該頁面的主標題 (`<h1>`) 後，若發現與原本譯名不同，且該項目未被設定為 `source: 'manual'` (最高優先權威) 保護，必須將該官方翻譯更新至 `custom_override.json`（設定 `titleZh` 與 `source: 'gamer'`）。**注意：嚴禁直接覆蓋或修改 `anime_data.json` 中的 `titleZh`**，以保持基礎字典翻譯的純淨並遵守既定的優先級設定（`manual` > `gamer` > `anime_data.json` > `ai`）。
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

## 4. 標題翻譯與來源優先度順序 (Source Priority Hierarchy)
系統處理繁體中文標題 (`titleZh`) 與覆蓋表時，採嚴格的降冪優先度順序，**高優先度來源將無條件保護，絕不被低優先度來源覆蓋**：
1. **Priority 1 (最高權威)：`source: 'manual'`**
   - 使用者手動指定的校正或專屬設定（寫在 `custom_override.json` 中），擁有最高絕對權威，爬蟲與洗滌腳本絕對不可修改或刪除。
2. **Priority 2 (官方百科)：`source: 'gamer'`**
   - 來自巴哈姆特 ACG 百科 H1 標題或動畫瘋官方授權譯名。當偵測到巴哈官方譯名與現有譯名不同時，會自動同步並更新覆蓋表（但若原本為 `manual` 則絕對跳過）。
3. **Priority 3 (自動翻譯/字典)：`source: 'ai'` / 預設字典**
   - 來自 AI 自動翻譯或 bangumi-data / ACG Secrets 預設對照。此層級權威最低，一旦偵測到巴哈官方譯名 (`gamer`) 或手動修改 (`manual`) 即會被取代。

---

## 5. 防呆與防護攔截過濾 (Anti-Crawling & Maintenance Protection)
當請求巴哈姆特 ACG 百科或動畫瘋時，若遭遇雲端防護、網路攔截或系統維修，**必須啟動嚴密過濾，嚴禁將異常字串誤設為動畫標題或 URL**：
- **阻擋關鍵字清單**：`['系統維修', '系統維護', 'Cloudflare', '請稍後', '巴哈姆特', 'Forbidden', '發生錯誤', 'Access Denied', '驗證碼', '注意力檢查']`
- **防呆判斷**：
  1. 若 HTTP Status Code 為 `403` 或 `503`。
  2. 若 HTML 內文或頁面標題 (`<h1>` / `<title>`) 包含上述任一**阻擋關鍵字**。
- **處置動作**：立即標示為 `isBlocked: true` 並印出警告，**拋棄本次請求取得的所有內容，保持原有的標題與 URL 不變**，防範任何污染寫入資料庫。

---

## 6. 架構落地與一致性保證
本規範已標準化整合至所有核心模組與腳本中：
- `scraper/scraper_utils.mjs`: 統一提供 `matchBangumiItem` 三階段精確比對、`calculateTitleSimilarity` 相似度計算與防護攔截字庫過濾。
- `scraper/wash_gamer_links.mjs` / `audit_gamer_links.mjs` / `rewash_all_gamer.mjs`: 導入 `matchBangumiItem`，全自動落實字典優先與繁中標題同步。
- `scraper/anime_crawler.js`: 每日排程爬取時，同時維護雙封面 (`coverImageGamer` / `coverImageAniList`) 並備份 `public/bangumi_data.json`。

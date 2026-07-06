---
name: manage-anime-data
description: 管理動畫資料庫的標準作業流程：修改譯名、新增動畫、補齊串流平台、管理封面與顯示狀態。所有對 anime_data.json 與 custom_override.json 的變更皆須遵循本 Skill。
---

# 動畫資料庫管理標準作業流程 (Manage Anime Data)

> [!IMPORTANT]
> 凡是涉及修改 `public/anime_data.json` 或 `public/custom_override.json` 中動畫譯名、新增動畫條目、補齊串流平台、調整封面或顯示與否（show）的操作，**必須依照本 Skill 的規範與 Schema 流程執行**。禁止在沒有遵循本規範的情況下直接手動修改檔案。

---

## 一、核心資料庫架構與職責邊界 (Core Schema & Responsibilities)

專案嚴格劃分「**客觀基礎公開資料**」與「**人工/平台/AI 覆蓋資料**」的儲存位置：

### 1. `public/anime_data.json`（基礎公開資料庫）
每日爬蟲與腳本自動維護的主表，專職儲存來自 AniList 與 bangumi-data 的基礎客觀資料：
- **ID 格式**：嚴格統一為 `anilist-XXXXX`（禁止純數字 ID）。
- **雙封面欄位**：
  - `coverImageAniList`：儲存來自 AniList 官方的封面。
  - `coverImageGamer`：儲存來自巴哈姆特動畫瘋的封面（若無則設為 `""`）。
  - **禁止存在 `coverImage` 與 `show` 屬性**：這兩個屬性已自基礎庫中移除，前端運行時會自動解析。
- **譯名來源**：`titleZh`、`titleEn`、`titleJa` 純粹來自 AniList 或 bangumi-data 字典。

### 2. `public/custom_override.json`（客製化與覆蓋表）
專門儲存人工校正、巴哈官方譯名、AI 覆蓋、自訂封面與顯示設定：
- **ID 格式**：嚴格統一為 `anilist-XXXXX`（禁止純數字 ID）。
- **譯名與來源優先度 (`source`) 與前端渲染優先序**：
  - `source` 僅允許以下三種值。
  - 前端渲染譯名優先序嚴格遵守：**1. `custom_override` 的 `manual` 與 `gamer` 翻譯優先 > 2. `anime_data.json` 的翻譯 (`titleZh`) > 3. `custom_override` 的 `ai` 翻譯**（只有當 `anime_data.json` 未提供有效譯名時，才會使用 `ai` 譯名）。
  - **禁止存在 `"bangumi-data"` 來源**：bangumi-data 的翻譯應直接寫在 `anime_data.json` 中。
- **顯示屬性 (`show`)**：
  - 若需隱藏動畫（不在前端顯示），寫入 `"show": false`。
  - 若正常顯示（True），**不用特別寫出該屬性**，保持檔案精簡。
- **自訂封面 (`coverImage`)**：
  - 若想指定呈現 AniList 封面或其他自訂 URL（例如不滿意巴哈封面時），在此設定 `"coverImage": "https://..."`。
  - 前端優先度為：`custom_override.coverImage` > `coverImageGamer` > `coverImageAniList`。
- **人工標題綁定 (`bangumiDataTitle`)**：
  - 當 AniList ID 無法在 bangumi-data 中對應時，在此設定 `"bangumiDataTitle": "日文原名"`，供四階段比對邏輯調用。

### 3. `public/bangumi_data.json`（字典檔本地與雲端同步）
- 每次爬蟲或更新時，系統會自動下載完整的 `bangumi-data` 原始 JSON 並寫入 `public/bangumi_data.json`。
- 該檔案會與 daily_jobs 一同 Commit 推送至 GitHub，供人工隨時審查與比對。

---

## 二、AniList 與 bangumi-data 四階段精確對應與輔助匯入規範

在爬蟲、資料清洗或校正時，將 AniList 動畫與 bangumi-data（社群開源字典）進行對齊，須嚴格遵守以下**四階段對照與匯入架構**：
1. **步驟一：判斷是否有原生物理對應資料 (`matchBangumiItem`)**：
   - 每日任務會對全庫動畫判斷是否具備原生的 bangumi-data 對應資料，僅判定兩項客觀物理優先序：
     - **優先序 A：AniList ID 精確對照**（查詢 `sites` 中的 aniList ID）。
     - **優先序 C：100% 日文標題精確對照**（AniList 的 `titleJa` 與 bangumi-data 的日文標題完全相等）。
2. **步驟二：將對應狀態記錄於額外 JSON (`public/bangumi_mapping_record.json`)**：
   - 將全庫所有動畫的對應狀態 (`hasCorrespondingData: true/false`)、比對方式與字典 ID 等資訊統一記錄於額外 JSON 檔案中，作為後續 AI 查找與輔助匯入的唯一客觀基準。
3. **步驟三：統一進行 AI 查找 (`runAiBangumiTitleMatch`)**：
   - 根據額外 JSON，篩選出 `hasCorrespondingData === false` 且尚未設定有效 `bangumiDataTitle` 的未關聯動畫，統一進行 AI 批次比對。
   - 成功命中者，系統自動將字典比對標題寫入 `custom_override.json` 的 `bangumiDataTitle` 欄位中。
   - **容錯與禁止鐵律**：100% 日文標題文字與假名、漢字必須相同，僅允許空格、標點符號及全形半形的差異。嚴格保留所有數字與羅馬數字（任何數字或年份差異嚴禁配對）。
4. **步驟四：藉由 `bangumiDataTitle` 輔助匯入資料與防重複保護**：
   - **防重複匯入鐵律**：遍歷額外 JSON 紀錄時，若該動畫本來就有對應資料 (`hasCorrespondingData === true`，已透過 Priority A 或 C 取得資料)，**即使 `custom_override.json` 中也有 `bangumiDataTitle`，系統必須立即跳過，嚴禁重複匯入資料**！
   - **輔助資料匯入與不覆蓋原則**：針對 JSON 中沒有對應資料 (`hasCorrespondingData === false`) 且有 `bangumiDataTitle` 的動畫，藉由該標題匯入相關資料（如繁體翻譯、中文授權平台、封面）：
     - **不覆蓋與不清除任何資料**：當透過 `bangumiDataTitle` 連結到 bangumi-data 並取得繁體中文翻譯時，僅僅是視為有連結到 bangumi-data (Priority 3)，因此會將中文翻譯寫入 `anime_data.json` 的 `titleZh` 欄位中（同一般對應流程）。**系統絕對不會清除、修改或覆蓋 `custom_override.json` 中的任何設定或 AI 譯名**！後續前端判斷顯示哪一個中文翻譯依然按照現有邏輯（custom_override manual/gamer > anime_data.json > custom_override ai）。
5. **追加授權相加規則**：若動畫在 bangumi-data 中無授權資料或缺漏部分平台，嚴禁擅自推測亂加。若有人工確認之補足授權，請在 `custom_override.json` 使用 `extraStreamings` 陣列屬性，系統將自動與原有 `streamings` 進行相加並去重排序。
6. **防重複綁定與授權去重規範 (Prevent Duplicate Binding & Deduplication)**：
   - **嚴禁多此一舉的重複映射**：若動畫透過「優先序 A（AniList ID）」或「優先序 C（100% 日文標題）」已經能正確對應到 bangumi-data 字典，**嚴禁在 `custom_override.json` 中多此一舉地寫入 `bangumiDataTitle`**！以保持 custom_override 的乾淨與避免雙重映射。
   - **串流平台嚴格去重**：任何管道在合併 `streamings` 陣列時，必須通過 `normalizeAndMergeStreamings()` 進行嚴格去重，從根本上杜絕網頁出現同一平台顯示兩次重複連結的錯誤。

---

## 三、修改動畫譯名與設定覆蓋 (Update Title & Overrides)

### 標準流程
1. **確認目標動畫 ID**：在 `public/anime_data.json` 中取得精確的 `anilist-XXXXX` 格式 ID。
2. **同步或覆蓋更新**：
   - 若為校正覆蓋，在 `public/custom_override.json` 寫入：
     ```json
     {
       "anilist-XXXXX": {
         "titleZh": "新譯名",
         "source": "manual",
         "coverImage": "https://... (非必填，欲指定封面時使用)",
         "show": false (非必填，欲隱藏時使用),
         "bangumiDataTitle": "日文原名 (非必填，ID無法對應時使用)",
         "extraStreamings": [
           {
             "site": "netflix",
             "name": "Netflix",
             "url": "https://www.netflix.com/tw/title/XXXXX"
           }
         ] (非必填，欲追加串流授權時使用，前端與爬蟲會和原有 streamings 採取相加處理)
       }
     }
     ```
3. **優先度鎖定規則**：人工指定的覆蓋一律設為 `"source": "manual"`（最高優先度）。
4. **寫入後驗證**：修改完成後必須讀取檔案，確認 Schema 相符且 JSON 格式有效。

### 腳本用法
使用 `scripts/update_titles.mjs` 腳本批次修改：
```bash
# fixes.json 內容: [{"id":"anilist-19163","newTitle":"約會大作戰 DATE A LIVE II"}]
node .agents/skills/manage-anime-data/scripts/update_titles.mjs fixes.json
```

---

## 四、新增動畫條目 (Add New Anime)

### 標準流程
1. **確認目標動畫的 AniList ID**
   - 優先查詢 `bangumi-data` 字典，以日文原名或已知 AniList ID 查找；確認資料庫中不存在該 ID。
2. **從 AniList API 與 bangumi-data 獲取資料**
   - 透過三階段比對，獲取 `titleZh`, `titleEn`, `titleJa`, `startDate`, `genres`, `streamings`。
   - 封面獲取：AniList 封面寫入 `coverImageAniList`；若有巴哈動畫瘋連結，嘗試獲取巴哈封面寫入 `coverImageGamer`（無則填 `""`）。
3. **串流平台收錄規則**
   - **全部收錄**：只要是 `type: 'onair'` 的平台皆須收錄。
   - **標註地區**：對照表：`["TW"]` → `台灣`、`["HK","MO"]` → `港澳`、`["TW","HK","MO"]` → `台港澳`、`["CN"]` → `中國`、`["JP"]` → `日本`、無或全球性 → `全球`。
   - **正規化合併**：必須通過 `normalizeAndMergeStreamings()` 處理。
4. **建立資料條目（新 Schema）**
   ```json
   {
     "id": "anilist-XXXXX",
     "titleZh": "繁體中文譯名",
     "titleEn": "English Title",
     "titleJa": "日本語タイトル",
     "coverImageAniList": "https://s4.anilist.co/.../large/...",
     "coverImageGamer": "https://p2.bahamut.com.tw/anime/...jpg",
     "startDate": { "year": 2026, "month": 10, "day": 4 },
     "yearSeason": "2026 秋",
     "genres": ["動作", "科幻"],
     "streamings": [...]
   }
   ```
5. **排序與驗證**
   - 寫入 `anime_data.json` 前必須重新排序：年份由新到舊（遞減），同年份按季節（秋 > 夏 > 春 > 冬）。

### 腳本範例
```bash
node .agents/skills/manage-anime-data/scripts/add_anime.mjs 4654
```

---

## 五、Genre 翻譯對照表

建立新條目時，`genres` 必須使用中文標籤：
| English | 中文 | English | 中文 |
|---|---|---|---|
| Action | 動作 | Sci-Fi | 科幻 |
| Adventure | 冒險 | Slice of Life | 日常 |
| Comedy | 喜劇 | Sports | 運動 |
| Drama | 劇情 | Supernatural | 超自然 |
| Fantasy | 奇幻 | Mecha | 機甲 |
| Horror | 恐怖 | Music | 音樂 |
| Mystery | 懸疑 | Psychological | 心理 |
| Romance | 愛情 | Thriller | 驚悚 |
| Mahou Shoujo | 魔法少女 | Boys Love / Girls Love | 耽美 / 百合 |
| Ecchi / Hentai | 福利 | Isekai / Super Power | 異世界 / 超能力 |

---

## 六、禁止事項
1. **禁止使用純數字 ID**：所有 key 必須為 `anilist-XXXXX` 格式。
2. **禁止在 `anime_data.json` 寫入 `coverImage` 或 `show` 屬性**：必須遵循雙封面欄位與自訂覆蓋規範。
3. **禁止在 `custom_override.json` 寫入 `source: "bangumi-data"`**：bangumi-data 翻譯應在 `anime_data.json`。
4. **禁止跳過排序與驗證**：寫入前須排序，寫入後須檢閱 JSON 格式。

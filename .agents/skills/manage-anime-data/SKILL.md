---
name: manage-anime-data
description: 管理動畫資料庫的標準作業流程：修改譯名、新增動畫、補齊串流平台。所有對 anime_data.json 與 custom_override.json 的變更皆須遵循本 Skill。
---

# 動畫資料庫管理標準作業流程 (Manage Anime Data)

> [!IMPORTANT]
> 凡是涉及修改 `public/anime_data.json` 或 `public/custom_override.json` 中動畫譯名、新增動畫條目、或補齊串流平台的操作，**必須依照本 Skill 的流程執行**。禁止在沒有遵循本規範的情況下直接手動修改檔案。

---

## 一、修改動畫譯名 (Update Title)

### 標準流程

1. **確認目標動畫 ID**
   - 在 `public/anime_data.json` 中以關鍵字搜尋，取得精確的 `anilist-XXXXX` 格式 ID。
   - **禁止使用純數字 ID**（如 `"19163"`），必須統一為 `"anilist-19163"` 格式。

2. **同步更新兩個檔案**
   - `public/anime_data.json`：找到對應項目，更新 `titleZh` 欄位。
   - `public/custom_override.json`：以 `anilist-XXXXX` 為 key，寫入：
     ```json
     {
       "anilist-XXXXX": {
         "titleZh": "新譯名",
         "source": "manual"
       }
     }
     ```

3. **優先度鎖定規則**
   - 使用者指定的譯名一律設為 `"source": "manual"`（最高優先度），確保每日爬蟲與 AI 翻譯皆不會覆蓋。
   - 若使用者未指定優先度，預設仍為 `"manual"`。

4. **寫入後驗證**
   - 修改完成後必須讀取兩個檔案，逐筆驗證 `anime_data.json` 的 `titleZh` 與 `custom_override.json` 的 `titleZh` + `source` 皆正確。

### 腳本用法

使用 `scripts/update_titles.mjs` 腳本，支援兩種輸入模式：

**模式 A：JSON 檔案（推薦，避免 PowerShell 引號問題）**
```bash
# 先建立 JSON 檔案
# fixes.json 內容: [{"id":"anilist-19163","newTitle":"約會大作戰 DATE A LIVE II"}]
node .agents/skills/manage-anime-data/scripts/update_titles.mjs fixes.json
```

**模式 B：直接傳入 JSON 字串（適用 Bash/Zsh）**
```bash
node .agents/skills/manage-anime-data/scripts/update_titles.mjs '[{"id":"anilist-19163","newTitle":"約會大作戰 DATE A LIVE II"}]'
```

---

## 二、新增動畫條目 (Add New Anime)

### 標準流程

1. **確認目標動畫的 AniList ID**
   - 優先查詢 `bangumi-data` 字典（GitHub 上的開源字典檔），以日文原名或已知 AniList ID 查找。
   - 若 `bangumi-data` 無紀錄，則嘗試 AniList API 搜尋。
   - 確認資料庫中不存在該 ID（去重檢查）。

2. **從 AniList API 獲取基礎資料**
   - 查詢 `id`, `title (romaji, english, native)`, `startDate`, `genres`, `tags`, `coverImage (extraLarge)`。
   - 若 AniList API 暫時停機，可使用 `bangumi-data` 字典中的已知資訊手動建立條目，但封面圖須使用 AniList CDN 標準路徑格式：`https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx{ID}-{hash}.png`。

3. **從 bangumi-data 獲取翻譯與串流平台**
   - 下載 `https://raw.githubusercontent.com/bangumi-data/bangumi-data/master/dist/data.json`。
   - 以 AniList ID 或日文原名精確比對，取得：
     - **繁中翻譯**：優先 `titleTranslate['zh-Hant']`，次要 `titleTranslate['zh-Hans']`（需 OpenCC 簡轉繁）。
     - **全部串流平台**：遍歷 `sites` 中所有 `type: 'onair'` 的項目。

4. **串流平台收錄規則**
   - **全部收錄**：不論地區（台灣、港澳、日本、中國大陸、全球），只要是 `type: 'onair'` 的平台皆須收錄。
   - **標註地區**：每個平台必須正確標註 `region`，對照表如下：

     | bangumi-data regions | AniSpace region |
     |---|---|
     | `["TW"]` | `台灣` |
     | `["HK","MO"]` | `港澳` |
     | `["TW","HK","MO"]` | `台港澳` |
     | `["CN"]` | `中國大陸` |
     | `["JP"]` | `日本` |
     | 無或全球性 | `全球` |

   - **平台名稱對照**：使用 `anime_crawler.js` 中的 `STREAMING_SITE_NAMES` 字典進行標準化命名。
   - **正規化合併**：最終必須通過 `normalizeAndMergeStreamings()` 函數處理（合併重複的 gamer/gamer_hk 等）。

5. **建立資料條目**
   - 依照以下結構建立：
     ```json
     {
       "id": "anilist-XXXXX",
       "titleZh": "繁體中文譯名",
       "titleEn": "English Title",
       "titleJa": "日本語タイトル",
       "coverImage": "最佳封面 URL",
       "coverImageAniList": "AniList 封面 URL",
       "startDate": { "year": 2008, "month": 10, "day": 4 },
       "yearSeason": "2008 秋",
       "genres": ["動作", "科幻"],
       "streamings": [...]
     }
     ```
   - `yearSeason` 格式為 `"YYYY 季"` ，季節對照：1-3月=冬、4-6月=春、7-9月=夏、10-12月=秋。

6. **寫入 custom_override.json**
   - 設定 `"source": "manual"` 鎖定譯名。

7. **排序**
   - 寫入 `anime_data.json` 前必須重新排序：年份由新到舊（遞減），同年份按季節（秋 > 夏 > 春 > 冬）。

8. **去重驗證**
   - 寫入後確認資料庫中無重複 ID。

### 腳本範例

使用 `scripts/add_anime.mjs` 腳本，傳入 AniList ID：

```bash
node .agents/skills/manage-anime-data/scripts/add_anime.mjs 4654
```

---

## 三、Genre 翻譯對照表

建立新條目時，`genres` 必須使用中文標籤，對照如下：

| English | 中文 |
|---|---|
| Action | 動作 |
| Adventure | 冒險 |
| Comedy | 喜劇 |
| Drama | 劇情 |
| Fantasy | 奇幻 |
| Horror | 恐怖 |
| Mystery | 懸疑 |
| Romance | 愛情 |
| Sci-Fi | 科幻 |
| Slice of Life | 日常 |
| Sports | 運動 |
| Supernatural | 超自然 |
| Mecha | 機甲 |
| Music | 音樂 |
| Psychological | 心理 |
| Thriller | 驚悚 |
| Mahou Shoujo | 魔法少女 |
| Boys Love | 耽美 |
| Girls Love | 百合 |
| Ecchi / Hentai | 福利 |

額外 tag 自動偵測規則（rank ≥ 75 才觸發）：
- `Isekai` → `異世界`
- `Super Power` → `超能力`

---

## 四、禁止事項

1. **禁止使用純數字 ID**：所有 key 必須為 `anilist-XXXXX` 格式。
2. **禁止跳過 bangumi-data 查詢**：新增動畫時必須查詢 bangumi-data 以獲取完整串流平台。
3. **禁止排除任何地區的平台**：所有 `type: 'onair'` 平台皆須收錄，正確標註地區即可。
4. **禁止跳過排序**：寫入 `anime_data.json` 前必須按年份季度排序。
5. **禁止跳過驗證**：修改或新增後必須讀取檔案驗證結果。

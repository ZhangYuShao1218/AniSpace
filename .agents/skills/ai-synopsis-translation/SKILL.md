---
name: ai-synopsis-translation
description: "規範與指引動畫多國語系簡介 (Synopsis) 的翻譯處理流程，確保 AI 翻譯邏輯的統一性，禁止隨意從外部 API (如 AniList) 覆蓋既有的多語系簡介欄位。"
---

# 劇情簡介 AI 翻譯規範 (AI Synopsis Translation)

> [!IMPORTANT]
> 專案中的動畫劇情簡介 (Synopsis) 已經全面採用 **AI 統一翻譯** 機制，以確保繁體中文、日文、英文的語氣與專有名詞對齊。

## 1. 翻譯來源與流程

- 專案依賴 `scraper/fetch_synopsis.mjs` 作為統一的多國語系簡介抓取與翻譯工具。
- 翻譯的**唯一樣本來源**是來自 Bangumi 的簡體中文摘要 (`bgmSummary`)。
- 該腳本會將 `bgmSummary` 丟給 Gemini AI，並根據 `scraper/ai_synopsis_prompt.md` 產出高品質的繁體中文 (`zh`)、日文 (`ja`) 與英文 (`en`) 簡介。
- 翻譯完成後，這三個語言的結果會被寫入到對應的 `public/anime_meta/[id].json` 檔案中。

## 2. 嚴格禁止事項 (CRITICAL)

- **禁止從 AniList 抓取英文簡介覆蓋**：請勿在爬蟲 (`anime_crawler.js`) 中嘗試從 AniList 抓取 `description` 並存成 `synopsisEn` 或其他欄位。這會破壞 AI 統一對齊中日英專有名詞的初衷。
- **禁止在前端繞過 JSON 欄位**：在 `useRichAnimeDetail.ts` 中讀取資料時，請**直接且唯一**依賴 `localJson.zh`, `localJson.ja`, `localJson.en`。若該語言欄位不存在，直接退回預設文字（例如「尚未收錄該作品之劇情簡介」），不應嘗試拿其他語言或額外欄位強行填補。
- **每日任務已整合**：上述翻譯流程已整合至 `daily_runner.mjs` 中的步驟 3。每日任務會分批自動處理缺乏翻譯的動畫（一次最多一百筆），這就是為什麼不需要前端即時去抓外部英文簡介的原因。

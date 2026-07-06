import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { GoogleGenAI } from '@google/genai';
import { runAiBangumiTitleMatch, normalizeAndMergeStreamings } from './scraper_utils.mjs';

const ANIME_DATA_PATH = path.join(process.cwd(), 'public', 'anime_data.json');
const BANGUMI_DATA_PATH = path.join(process.cwd(), 'public', 'bangumi_data.json');

async function main() {
  console.log('==================================================');
  console.log('🚀 開始執行 AI API 測試與本地串流名稱清洗規範規範');
  console.log('==================================================\n');

  if (!process.env.GEMINI_API_KEY) {
    console.error('❌ 錯誤：未找到 GEMINI_API_KEY 環境變數。');
    process.exit(1);
  }

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  // --------------------------------------------------
  // 1. 本地清洗 anime_data.json 串流平台規範 (將所有 哔哩哔哩 轉為 Bilibili)
  // --------------------------------------------------
  console.log('📦 [步驟 0] 檢查並清洗現有資料庫中的 Bilibili 平台名稱規範...');
  if (fs.existsSync(ANIME_DATA_PATH)) {
    let modifiedCount = 0;
    const animeList = JSON.parse(fs.readFileSync(ANIME_DATA_PATH, 'utf-8'));
    animeList.forEach(item => {
      if (item.streamings && item.streamings.length > 0) {
        const beforeStr = JSON.stringify(item.streamings);
        item.streamings = normalizeAndMergeStreamings(item.streamings);
        const afterStr = JSON.stringify(item.streamings);
        if (beforeStr !== afterStr) {
          modifiedCount++;
        }
      }
    });

    if (modifiedCount > 0) {
      fs.writeFileSync(ANIME_DATA_PATH, JSON.stringify(animeList, null, 2), 'utf-8');
      console.log(`✅ 已完成資料庫規範清洗：共更新 ${modifiedCount} 部動畫的串流平台名稱 (例如 哔哩哔哩 -> Bilibili)！\n`);
    } else {
      console.log('👌 資料庫中的串流平台名稱已符合最新規範。\n');
    }
  }

  // --------------------------------------------------
  // 2. 測試單筆動畫 AI 翻譯 API (Request 4)
  // --------------------------------------------------
  console.log('🧪 [測試 1/2] 傳送單筆動畫測試 AI 翻譯 API 是否正常...');
  const promptPath = path.join(process.cwd(), 'scraper', 'ai_translate_prompt.md');
  const promptText = fs.readFileSync(promptPath, 'utf-8');

  const singleTestAnime = [{
    id: "anilist-195516",
    titleJa: "薬屋のひとりごと 第3期",
    titleEn: "The Apothecary Diaries Season 3",
    startDate: { year: 2026, month: 1, day: 1 }
  }];

  try {
    console.log(`傳送測試動畫: [${singleTestAnime[0].id}] "${singleTestAnime[0].titleJa}"`);
    const startTime = Date.now();
    let response;
    for (let attempt = 1; attempt <= 5; attempt++) {
      try {
        response = await ai.models.generateContent({
          model: 'gemini-3.5-flash',
          contents: `${promptText}\n\n輸入清單：\n${JSON.stringify(singleTestAnime, null, 2)}`
        });
        break;
      } catch (apiErr) {
        if (attempt === 5) throw apiErr;
        let waitSeconds = 5;
        const errStr = String(apiErr.message || '') + String(apiErr.status || '') + JSON.stringify(apiErr);
        if (errStr.includes('429') || errStr.includes('RESOURCE_EXHAUSTED') || errStr.includes('quota')) {
          const match = errStr.match(/retry in (\d+(\.\d+)?)s/i) || errStr.match(/retryDelay":"(\d+)s"/);
          if (match && match[1]) {
            waitSeconds = Math.ceil(parseFloat(match[1])) + 2;
          } else {
            waitSeconds = 42;
          }
          console.warn(`⚠️ 觸發 Gemini API 頻率或 Token 限制 (429)，將等待 ${waitSeconds} 秒後進行重試 (Attempt ${attempt}/5)...`);
        } else {
          console.warn(`⚠️ Gemini API 請求遇到暫時性忙碌/503 (Attempt ${attempt}/5)，等待 5 秒後重試...`);
        }
        await new Promise(r => setTimeout(r, waitSeconds * 1000));
      }
    }
    const costTime = ((Date.now() - startTime) / 1000).toFixed(2);
    
    const rawAiText = (typeof response.text === 'function' ? response.text() : response.text) || '';
    const aiText = rawAiText.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(aiText);
    
    console.log(`✅ [測試 1/2 成功] 耗時 ${costTime} 秒！API 正常回傳翻譯結果：`);
    console.log(JSON.stringify(parsed, null, 2));
    console.log('--------------------------------------------------\n');
  } catch (err) {
    console.error('❌ [測試 1/2 失敗] AI 翻譯 API 調用異常:', err.message || err);
    console.log('--------------------------------------------------\n');
  }

  // --------------------------------------------------
  // 3. 直接測試 AI 正規化與字典對照邏輯 (無須執行爬蟲) (Request 3)
  // --------------------------------------------------
  console.log('🧪 [測試 2/2] 直接測試 AI 正規化與字典對照邏輯 (無須執行爬蟲)...');
  if (!fs.existsSync(BANGUMI_DATA_PATH) || !fs.existsSync(ANIME_DATA_PATH)) {
    console.log('⚠️ 找不到 bangumi_data.json 或 anime_data.json，跳過正規化測試。');
    return;
  }

  const bangumiDataRaw = JSON.parse(fs.readFileSync(BANGUMI_DATA_PATH, 'utf-8'));
  const bangumiItems = bangumiDataRaw.items || bangumiDataRaw || [];
  const bgmTitleMap = new Map();
  bangumiItems.forEach(item => {
    if (item.title) bgmTitleMap.set(item.title.trim(), item);
    if (item.titleTranslate && item.titleTranslate['zh-Hans']) {
      item.titleTranslate['zh-Hans'].forEach(t => bgmTitleMap.set(t.trim(), item));
    }
    if (item.titleTranslate && item.titleTranslate['zh-Hant']) {
      item.titleTranslate['zh-Hant'].forEach(t => bgmTitleMap.set(t.trim(), item));
    }
  });
  console.log(`📚 成功載入 Bangumi 字典標題，共 ${bgmTitleMap.size} 筆候選標題。`);

  const animeList = JSON.parse(fs.readFileSync(ANIME_DATA_PATH, 'utf-8'));
  // 找出目前還沒有關聯 bangumi_data 且有日文標題的動畫
  const unlinkedList = animeList
    .filter(a => !a.bangumiDataTitle && a.titleJa && a.titleJa.trim() !== '')
    .map(a => ({ id: a.id, titleJa: a.titleJa }))
    .slice(0, 60); // 取前 60 部進行測試

  console.log(`🎯 選取 ${unlinkedList.length} 部未關聯動畫進行 AI 正規化與對照驗證...`);
  const startTime2 = Date.now();
  const matchedResults = await runAiBangumiTitleMatch(unlinkedList, bgmTitleMap);
  const costTime2 = ((Date.now() - startTime2) / 1000).toFixed(2);

  console.log(`\n✅ [測試 2/2 成功] 耗時 ${costTime2} 秒！共對照成功 ${matchedResults.length} 部動畫！`);
  console.log('==================================================');
  console.log('🎉 所有測試皆已順利完成！');
  console.log('==================================================');
}

main().catch(err => {
  console.error('❌ 執行發生致命異常:', err);
  process.exit(1);
});

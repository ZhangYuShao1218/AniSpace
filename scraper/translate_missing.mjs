import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { GoogleGenAI } from '@google/genai';

const DATA_FILE = path.join(process.cwd(), 'public', 'anime_data.json');
const OVERRIDE_FILE = path.join(process.cwd(), 'public', 'custom_override.json');
const PROMPT_FILE = path.join(process.cwd(), 'scraper', 'ai_translate_prompt.md');

async function translateMissing() {
  if (!process.env.GEMINI_API_KEY) {
    console.error("❌ 找不到 GEMINI_API_KEY，無法進行 AI 翻譯。");
    process.exit(1);
  }

  if (!fs.existsSync(DATA_FILE)) {
    console.error("❌ 找不到 public/anime_data.json，請先執行下載或爬蟲。");
    process.exit(1);
  }

  const animeList = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
  let overrideData = {};
  if (fs.existsSync(OVERRIDE_FILE)) {
    overrideData = JSON.parse(fs.readFileSync(OVERRIDE_FILE, 'utf-8'));
  }

  // 篩選出 2025/2026/2027 年缺乏中文翻譯的動畫
  const missingTranslations = [];
  animeList.forEach(anime => {
    const isRecent = anime.yearSeason.startsWith('2025') || anime.yearSeason.startsWith('2026') || anime.yearSeason.startsWith('2027');
    if (isRecent && (anime.titleZh === anime.titleJa || anime.titleZh === anime.titleEn || anime.titleZh === '未知動畫')) {
      const aniListId = anime.id.replace('anilist-', '');
      // 如果 override 已經有中文就不重複翻譯
      if (!overrideData[aniListId] || !overrideData[aniListId].titleZh) {
        missingTranslations.push({
          id: aniListId,
          titleJa: anime.titleJa,
          titleEn: anime.titleEn
        });
      }
    }
  });

  if (missingTranslations.length === 0) {
    console.log("✨ 目前近期動畫清單中沒有缺乏中文翻譯的項目！");
    return;
  }

  console.log(`\n🤖 發現 ${missingTranslations.length} 部近期動畫缺乏翻譯，開始批次呼叫 Gemini AI...`);

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const promptText = fs.readFileSync(PROMPT_FILE, 'utf-8');
  let translatedCount = 0;
  let dataChanged = false;

  // 以 30 筆為一個批次進行翻譯，確保 AI 回傳 JSON 不過長且穩定
  const BATCH_SIZE = 30;
  for (let i = 0; i < missingTranslations.length; i += BATCH_SIZE) {
    const batch = missingTranslations.slice(i, i + BATCH_SIZE);
    console.log(`正在翻譯第 ${i + 1} ~ ${Math.min(i + BATCH_SIZE, missingTranslations.length)} 筆...`);

    try {
      let response;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          response = await ai.models.generateContent({
            model: 'gemini-3.5-flash',
            contents: `${promptText}\n\n輸入清單：\n${JSON.stringify(batch, null, 2)}`
          });
          break;
        } catch (apiErr) {
          if (attempt === 3) throw apiErr;
          console.warn(`⚠️ Gemini API 請求暫時繁忙 (Attempt ${attempt}/3)，等待 3 秒後重試...`);
          await new Promise(r => setTimeout(r, 3000));
        }
      }

      const rawAiText = (typeof response.text === 'function' ? response.text() : response.text) || '';
      const aiText = rawAiText.replace(/```json/g, '').replace(/```/g, '').trim();
      const aiResult = JSON.parse(aiText);

      aiResult.forEach(res => {
        if (res.titleZh && res.id) {
          const idStr = String(res.id);
          // 更新 overrideData
          if (!overrideData[idStr]) overrideData[idStr] = {};
          if (overrideData[idStr].titleZh !== res.titleZh || overrideData[idStr].source !== 'ai') {
            overrideData[idStr].titleZh = res.titleZh;
            overrideData[idStr].source = 'ai';
            translatedCount++;
            dataChanged = true;
          }
          // 同步更新 animeList
          const target = animeList.find(a => a.id === `anilist-${idStr}`);
          if (target) {
            target.titleZh = res.titleZh;
          }
        }
      });
    } catch (err) {
      console.error(`❌ 批次翻譯失敗:`, err.message);
    }

    // 避免 API 速率限制
    if (i + BATCH_SIZE < missingTranslations.length) {
      await new Promise(r => setTimeout(r, 2000));
    }
  }

  if (dataChanged) {
    fs.writeFileSync(OVERRIDE_FILE, JSON.stringify(overrideData, null, 2), 'utf-8');
    fs.writeFileSync(DATA_FILE, JSON.stringify(animeList, null, 2), 'utf-8');
    console.log(`\n✅ AI 翻譯完成！共翻譯了 ${translatedCount} 部動畫，已更新 custom_override.json 與 anime_data.json。`);
  } else {
    console.log(`\n✨ AI 翻譯處理完成，沒有更新新的譯名。`);
  }
}

translateMissing();

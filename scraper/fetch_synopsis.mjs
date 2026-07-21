import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { GoogleGenAI } from '@google/genai';

const DATA_FILE = path.join(process.cwd(), 'public', 'anime_data.json');
const MAPPING_FILE = path.join(process.cwd(), 'public', 'bangumi_mapping_record.json');
const TRACKING_FILE = path.join(process.cwd(), 'scraper', 'synopsis_tracking.json');
const NEWLY_FETCHED_FILE = path.join(process.cwd(), 'scraper', 'synopsis_newly_fetched.json');
const SYNOPSIS_DIR = path.join(process.cwd(), 'public', 'anime_meta');
const PROMPTS_FILE = path.join(process.cwd(), 'scraper', 'ai_synopsis_prompt.md');

// Setup Google Gen AI
const ai = process.env.GEMINI_API_KEY ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }) : null;

// Helpers
const delay = (ms) => new Promise(res => setTimeout(res, ms));

async function fetchBangumiSummary(bgmId) {
  try {
    const res = await fetch(`https://api.bgm.tv/v0/subjects/${bgmId}`, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    if (res.status === 404) return '';
    const json = await res.json();
    return json?.summary || '';
  } catch (e) {
    console.error(`Bangumi API Error for ${bgmId}: ${e.message}`);
    return '';
  }
}

async function aiTranslateBatch(batchArray) {
  if (!ai || batchArray.length === 0) return null;
  const promptTemplate = fs.readFileSync(PROMPTS_FILE, 'utf-8');
  
  // Format input as pretty JSON
  const batchInputString = JSON.stringify(batchArray, null, 2);
  const prompt = promptTemplate.replace('{batchInput}', batchInputString);

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: prompt,
        config: { 
          temperature: 0.2,
          responseMimeType: "application/json" 
        }
      });
      const text = response.text.trim();
      return JSON.parse(text); // Should be an Array of { id, zh, ja, en }
    } catch (apiErr) {
      if (attempt === 3) {
        console.error(`AI Translation Error (Batch): ${apiErr.message}`);
        return null;
      }
      console.log(`⚠️ AI 觸發頻率限制或發生錯誤，強制冷卻 60 秒後重試 (第 ${attempt}/3 次)...`);
      await delay(60000); // 延長為 60 秒以確保 Bucket 清空
    }
  }
  return null;
}

async function main() {
  if (!fs.existsSync(SYNOPSIS_DIR)) fs.mkdirSync(SYNOPSIS_DIR, { recursive: true });
  
  if (!fs.existsSync(DATA_FILE) || !fs.existsSync(MAPPING_FILE)) {
    console.error("Required data files not found.");
    return;
  }

  const animeData = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
  const mappingRecord = JSON.parse(fs.readFileSync(MAPPING_FILE, 'utf-8'));
  
  // Load Tracker
  let tracker = {};
  if (fs.existsSync(TRACKING_FILE)) {
    tracker = JSON.parse(fs.readFileSync(TRACKING_FILE, 'utf-8'));
  }

  // Load Newly Fetched list
  let newlyFetched = [];
  if (fs.existsSync(NEWLY_FETCHED_FILE)) {
    try {
      newlyFetched = JSON.parse(fs.readFileSync(NEWLY_FETCHED_FILE, 'utf-8'));
    } catch(e) {}
  }

  // Build AniList -> Bangumi ID Map
  const anilistToBgmMap = new Map();
  for (const key of Object.keys(mappingRecord)) {
    const item = mappingRecord[key];
    if (item.bgmId) {
      anilistToBgmMap.set(key, item.bgmId);
    }
  }

  let processedCount = 0;
  let batchQueue = [];
  const BATCH_SIZE = 10;
  const TOTAL_LIMIT = 30;

  // AI Translation Batch logic is temporarily disabled as per user request
  // It is replaced by simply saving the fetched raw Bangumi summary to the meta json.
  async function flushBatch() {
    if (batchQueue.length === 0) return;
    
    console.log(`\n📦 準備儲存 ${batchQueue.length} 筆簡體中文簡介 (暫停 AI 翻譯)...`);
    
    for (const originalAnime of batchQueue) {
      const id = originalAnime.id;
      const synopsisPath = path.join(SYNOPSIS_DIR, `${id}.json`);
      let currentSynopsis = {};
      if (fs.existsSync(synopsisPath)) {
        currentSynopsis = { ...JSON.parse(fs.readFileSync(synopsisPath, 'utf-8')) };
      }

      // Save the raw simplified Chinese summary for future translation
      currentSynopsis.bgmSummary = originalAnime.sourceSummary || '';
      
      // Save
      fs.writeFileSync(synopsisPath, JSON.stringify(currentSynopsis, null, 2), 'utf-8');
      
      // Mark as fully fetched in tracker (we pretend it is fetched to prevent re-fetching Bangumi API endlessly)
      tracker[id] = { zh: true, ja: true, en: true };
      
      // Add to newly fetched for email
      newlyFetched.push({ id, title: originalAnime.titleZh });
      
      console.log(`✅ [${id}] 已儲存簡體中文簡介: ${originalAnime.titleZh}`);
      processedCount++;
    }

    fs.writeFileSync(TRACKING_FILE, JSON.stringify(tracker, null, 2), 'utf-8');
    fs.writeFileSync(NEWLY_FETCHED_FILE, JSON.stringify(newlyFetched, null, 2), 'utf-8');
    
    batchQueue = [];
  }

  for (const anime of animeData) {
    if (processedCount + batchQueue.length >= TOTAL_LIMIT) {
      break; 
    }

    const id = anime.id; // e.g. "anilist-12345"
    if (!id.startsWith('anilist-')) continue;
    
    if (!tracker[id]) {
      tracker[id] = { zh: false, ja: false, en: false };
    }
    const t = tracker[id];
    if (t.zh && t.ja && t.en) continue; // Fully fetched

    const bgmId = anilistToBgmMap.get(id);
    if (!bgmId) continue; // 沒有建檔跳過

    // Fetch from Bangumi
    const bgmSummary = await fetchBangumiSummary(bgmId);
    await delay(1000); // Bangumi Rate Limit (1s)

    if (bgmSummary && bgmSummary.trim() !== '') {
      batchQueue.push({
        id: id,
        titleZh: anime.titleZh,
        titleJa: anime.titleJa,
        titleEn: anime.titleEn || anime.titleJa,
        sourceSummary: bgmSummary
      });
      console.log(`📥 [${id}] 已加入批次佇列: ${anime.titleZh} (佇列: ${batchQueue.length}/${BATCH_SIZE})`);

      if (batchQueue.length >= BATCH_SIZE || (processedCount + batchQueue.length) >= TOTAL_LIMIT) {
        await flushBatch();
      }
    } else {
      // 沒有簡介就不處理，不改 tracker 讓他明天再來查
    }
  }
  
  // Flush any remaining items in the queue
  if (batchQueue.length > 0 && processedCount < TOTAL_LIMIT) {
    await flushBatch();
  }

  console.log(`\n🎉 Synopsis fetching complete. Processed ${processedCount} animes.`);
}

main().catch(console.error);

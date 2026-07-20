import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { GoogleGenAI } from '@google/genai';

const DATA_FILE = path.join(process.cwd(), 'public', 'anime_data.json');
const MAPPING_FILE = path.join(process.cwd(), 'public', 'bangumi_mapping_record.json');
const TRACKING_FILE = path.join(process.cwd(), 'scraper', 'synopsis_tracking.json');
const SYNOPSIS_DIR = path.join(process.cwd(), 'public', 'synopsis');
const PROMPTS_FILE = path.join(process.cwd(), 'scraper', 'ai_synopsis_prompt.md');

// Setup Google Gen AI
const ai = process.env.GEMINI_API_KEY ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }) : null;

// Helpers
const delay = (ms) => new Promise(res => setTimeout(res, ms));

async function fetchAniListDescription(anilistId) {
  const query = `
    query ($id: Int) {
      Media(id: $id) {
        description(asHtml: false)
      }
    }
  `;
  try {
    const res = await fetch('https://graphql.anilist.co', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ query, variables: { id: parseInt(anilistId, 10) } })
    });
    const json = await res.json();
    return json?.data?.Media?.description || '';
  } catch (e) {
    console.error(`AniList API Error for ${anilistId}: ${e.message}`);
    return '';
  }
}

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

async function aiTranslate(promptSectionName, inputs) {
  if (!ai) return '';
  const promptsText = fs.readFileSync(PROMPTS_FILE, 'utf-8');
  const sections = promptsText.split('---');
  const targetSection = sections.find(s => s.includes(promptSectionName));
  if (!targetSection) return '';

  let prompt = targetSection;
  for (const [key, value] of Object.entries(inputs)) {
    prompt = prompt.replace(`{${key}}`, value || '');
  }

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: prompt,
        config: { temperature: 0.2 }
      });
      return response.text.trim();
    } catch (apiErr) {
      if (attempt === 3) {
        console.error(`AI Translation Error (${promptSectionName}): ${apiErr.message}`);
        return '';
      }
      await delay(2000 * attempt);
    }
  }
  return '';
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

  // Build AniList -> Bangumi ID Map from mapping record
  const anilistToBgmMap = new Map();
  for (const key of Object.keys(mappingRecord)) {
    const item = mappingRecord[key];
    if (item.bgmId) {
      anilistToBgmMap.set(key, item.bgmId);
    }
  }

  let processedCount = 0;

  for (const anime of animeData) {
    const id = anime.id; // e.g. "anilist-12345"
    if (!id.startsWith('anilist-')) continue;
    
    if (!tracker[id]) {
      tracker[id] = { zh: false, ja: false, en: false };
    }
    const t = tracker[id];
    if (t.zh && t.ja && t.en) continue; // Fully fetched

    const synopsisPath = path.join(SYNOPSIS_DIR, `${id}.json`);
    let currentSynopsis = { zh: '', ja: '', en: '' };
    if (fs.existsSync(synopsisPath)) {
      currentSynopsis = { ...currentSynopsis, ...JSON.parse(fs.readFileSync(synopsisPath, 'utf-8')) };
    }

    let needsWait = false;
    let bgmSummary = null;
    const bgmId = anilistToBgmMap.get(id);

    // EN
    if (!t.en) {
      needsWait = true;
      const numericId = id.replace('anilist-', '');
      const enDesc = await fetchAniListDescription(numericId);
      if (enDesc) {
        currentSynopsis.en = enDesc;
        t.en = true;
        console.log(`✅ [${id}] EN Fetch success`);
      } else {
        // Mark true if AniList genuinely returns empty, but let's be safe: if empty, maybe it really has no desc.
        // Actually, if we hit network error we shouldn't mark true. The helper returns '' on error.
        // We'll mark true to prevent endless retries for missing animes.
        t.en = true; 
      }
      await delay(1000);
    }

    // ZH & JA
    if (!t.zh || !t.ja) {
      if (bgmId) {
        needsWait = true;
        bgmSummary = await fetchBangumiSummary(bgmId);
        await delay(1000);
      } else {
        // Cannot fetch without bgmId, mark as true so we skip it in the future
        t.zh = true;
        t.ja = true;
      }
    }

    if (bgmSummary) {
      if (!t.zh) {
        const zhResult = await aiTranslate('Traditional Chinese Localization', {
          titleZh: anime.titleZh,
          titleJa: anime.titleJa,
          sourceSummary: bgmSummary
        });
        if (zhResult) {
          currentSynopsis.zh = zhResult;
          t.zh = true;
          console.log(`✅ [${id}] ZH Translate success`);
        }
        await delay(1000);
      }

      if (!t.ja) {
        const jaResult = await aiTranslate('Japanese Translation', {
          titleZh: anime.titleZh,
          titleJa: anime.titleJa,
          zhSummary: bgmSummary
        });
        if (jaResult) {
          currentSynopsis.ja = jaResult;
          t.ja = true;
          console.log(`✅ [${id}] JA Translate success`);
        }
        await delay(1000);
      }
    }

    if (needsWait) {
      // Save data incrementally
      fs.writeFileSync(synopsisPath, JSON.stringify(currentSynopsis, null, 2), 'utf-8');
      fs.writeFileSync(TRACKING_FILE, JSON.stringify(tracker, null, 2), 'utf-8');
      processedCount++;
      // Stop after 20 to avoid exhausting API or running forever during development/testing
      if (processedCount >= 20) {
        console.log("Reached batch limit of 20, stopping for this run. Next run will continue.");
        break;
      }
    }
  }
  
  console.log(`\n🎉 Synopsis fetching complete. Processed ${processedCount} animes.`);
}

main().catch(console.error);

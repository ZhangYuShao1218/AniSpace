import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import * as OpenCC from 'opencc-js';
import { GoogleGenAI } from '@google/genai';
import { resolveGamerStreamingUrl, resolveGamerInfo, normalizeAndMergeStreamings, matchBangumiItem } from './scraper_utils.mjs';
import { washGamerStreamings } from './wash_gamer_links.mjs';

const DATA_FILE = path.join(process.cwd(), 'public', 'anime_data.json');
const GAMER_CACHE_FILE = path.join(process.cwd(), 'scraper', 'gamer_url_cache.json');
const START_YEAR = 2010;

const genreMap = {
  'Action': '動作', 'Adventure': '冒險', 'Comedy': '喜劇', 'Drama': '劇情',
  'Fantasy': '奇幻', 'Horror': '恐怖', 'Mystery': '懸疑', 'Romance': '愛情',
  'Sci-Fi': '科幻', 'Slice of Life': '日常', 'Sports': '運動', 'Supernatural': '超自然',
  'Suspense': '懸疑', 'Award Winning': '獲獎', 'Avant Garde': '前衛', 'Boys Love': '耽美',
  'Girls Love': '百合', 'Gourmet': '美食', 'Mecha': '機甲', 'Music': '音樂', 'Psychological': '心理',
  'Thriller': '驚悚', 'Mahou Shoujo': '魔法少女', 'Hentai': '福利', 'Ecchi': '福利'
};

const SEASON_MONTH_MAP = {
  'WINTER': '01',
  'SPRING': '04',
  'SUMMER': '07',
  'FALL': '10'
};

const STREAMING_SITE_NAMES = {
  gamer: { name: '動畫瘋', region: '台灣' },
  gamer_hk: { name: '動畫瘋', region: '港澳' },
  muse_tw: { name: '木棉花 YouTube', region: '台灣' },
  muse_hk: { name: '木棉花 YouTube', region: '港澳' },
  ani_one: { name: 'Ani-One YouTube', region: '亞洲' },
  ani_one_asia: { name: 'Ani-One Asia', region: '亞洲' },
  tropics: { name: '回歸線娛樂', region: '台灣' },
  kktv: { name: 'KKTV', region: '台灣' },
  linetv: { name: 'LINE TV', region: '台灣' },
  friday: { name: 'friDay影音', region: '台灣' },
  myvideo: { name: 'MyVideo', region: '台灣' },
  hamivideo: { name: 'Hami Video', region: '台灣' },
  bilibili_tw: { name: 'Bilibili', region: '台灣' },
  bilibili_hk_mo_tw: { name: 'Bilibili', region: '港澳台' },
  bilibili_hk_mo: { name: 'Bilibili', region: '港澳' },
  bilibili: { name: 'Bilibili', region: '中國' },
  iqiyi: { name: '愛奇藝', region: '亞洲' },
  netflix: { name: 'Netflix', region: '全球' },
  disneyplus: { name: 'Disney+', region: '全球' },
  prime: { name: 'Prime Video', region: '全球' },
  prime_video: { name: 'Prime Video', region: '全球' },
  amazon_prime_video: { name: 'Prime Video', region: '全球' },
  crunchyroll: { name: 'Crunchyroll', region: '全球' },
  youtube: { name: 'YouTube', region: '亞洲' },
  viu: { name: 'Viu', region: '港澳' },
  mytv: { name: 'myTV SUPER', region: '港澳' },
  abema: { name: 'ABEMA', region: '日本' },
  nicovideo: { name: 'NicoNico', region: '日本' },
  danime: { name: 'd動畫商城', region: '日本' },
  unext: { name: 'U-NEXT', region: '日本' }
};

function getStreamingUrl(siteObj, siteMeta) {
  if (siteObj.url) return siteObj.url;
  const meta = siteMeta?.[siteObj.site];
  if (meta && meta.urlTemplate) {
    return meta.urlTemplate.replace('{{id}}', siteObj.id);
  }
  return `https://www.google.com/search?q=${encodeURIComponent(siteObj.id)}`;
}

// ACG Secrets for fallback translation
async function fetchACGSecretsTitles(year, season) {
  const month = SEASON_MONTH_MAP[season.toUpperCase()];
  if (!month) return new Map();
  try {
    const url = `https://acgsecrets.hk/bangumi/${year}${month}/`;
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const html = await res.text();
    const titleMap = new Map();
    const regex = /"name":"([^"]+)","alternateName":\["([^"]+)"/g;
    let match;
    while ((match = regex.exec(html)) !== null) {
      if (match[1].trim() && match[2].trim()) titleMap.set(match[2].trim(), match[1].trim());
    }
    return titleMap;
  } catch (e) {
    return new Map();
  }
}

// Check if Bahamut ACG cover exists via HEAD request
async function getBahamutCover(gamerId) {
  const idStr = String(gamerId);
  const folder = idStr.slice(-2).padStart(2, '0');
  const paddedId = idStr.padStart(10, '0');
  const url = `https://p2.bahamut.com.tw/B/ACG/c/${folder}/${paddedId}.JPG`;
  
  try {
    const res = await fetch(url, { method: 'HEAD', headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(3000) });
    if (res.ok) return url;
  } catch (e) {
    return null;
  }
  return null;
}

// Fetch Bilibili Cover
async function getBilibiliCover(bilibiliId) {
  try {
    const url = `https://api.bilibili.com/pgc/view/web/season?season_id=${bilibiliId}`;
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(3000) });
    const data = await res.json();
    if (data && data.result && data.result.cover) {
      return data.result.cover;
    }
  } catch (e) {
    return null;
  }
  return null;
}

async function fetchAniListBySeason(year, season) {
  const query = `
    query ($season: MediaSeason, $seasonYear: Int) {
      Page(page: 1, perPage: 100) {
        media(season: $season, seasonYear: $seasonYear, type: ANIME, sort: POPULARITY_DESC, isAdult: false) {
          id
          title { romaji english native }
          startDate { year month day }
          genres
          tags { name rank }
          coverImage { large extraLarge }
          relations {
            edges { relationType node { id title { romaji native english } } }
          }
        }
      }
    }
  `;
  try {
    const res = await fetch('https://graphql.anilist.co', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ query, variables: { season, seasonYear: year } })
    });
    const json = await res.json();
    return json.data.Page.media || [];
  } catch (e) {
    console.error(`AniList API error for ${year} ${season}:`, e.message);
    return [];
  }
}

async function main() {
  const ALL_SEASONS = ['WINTER', 'SPRING', 'SUMMER', 'FALL'];
  const converter = OpenCC.Converter({ from: 'cn', to: 'tw' });
  let finalAnimeList = [];
  let missingTranslations = [];

  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1; // 1-12
  const END_YEAR = currentYear + 1; // Allows fetching next year if next season crosses year boundary

  // Define season indices: 0=WINTER, 1=SPRING, 2=SUMMER, 3=FALL
  const currentSeasonIndex = Math.floor((currentMonth - 1) / 3);
  let nextSeasonYear = currentYear;
  let nextSeasonIndex = currentSeasonIndex + 1;
  if (nextSeasonIndex > 3) {
    nextSeasonIndex = 0;
    nextSeasonYear++;
  }

  const getSeasonScore = (y, idx) => y * 4 + idx;
  const currentScore = getSeasonScore(currentYear, currentSeasonIndex);
  const targetScores = [currentScore - 2, currentScore - 1, currentScore, currentScore + 1];

  const overridePath = path.join(process.cwd(), 'public', 'custom_override.json');
  let overrideData = {};
  if (fs.existsSync(overridePath)) {
    overrideData = JSON.parse(fs.readFileSync(overridePath, 'utf-8'));
  }

  const existingIds = new Set();
  let oldDataMap = new Map();
  if (fs.existsSync(DATA_FILE)) {
    try {
      const oldData = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
      oldData.forEach(item => {
        existingIds.add(item.id);
        oldDataMap.set(item.id, item);
      });
    } catch(e) {}
  }
  let newlyAddedAnimes = [];
  let aiTranslatedAnimes = [];

  console.log('📦 正在下載 bangumi-data 字典檔...');
  let bgmMap = new Map(); // aniListId -> translation Object
  let bgmTitleMap = new Map(); // titleJa -> translation Object
  let bgmSiteMeta = {};
  try {
    const res = await fetch("https://raw.githubusercontent.com/bangumi-data/bangumi-data/master/dist/data.json");
    if (res.ok) {
      const dataText = await res.text();
      const bgmFilePath = path.join(process.cwd(), 'public', 'bangumi_data.json');
      fs.writeFileSync(bgmFilePath, dataText, 'utf-8');
      console.log(`💾 已將 bangumi-data 完整字典檔寫入本地: ${bgmFilePath}`);
      const data = JSON.parse(dataText);
      bgmSiteMeta = data.siteMeta || {};
      (data.items || []).forEach(item => {
        const aniListSite = item.sites?.find(s => s.site === 'aniList');
        if (aniListSite && aniListSite.id) {
          bgmMap.set(aniListSite.id, item);
        }
        if (item.title) {
          bgmTitleMap.set(item.title.trim(), item);
        }
      });
      console.log(`✅ 字典檔載入完成，共建立 ${bgmMap.size} 筆 AniList ID 映射，${bgmTitleMap.size} 筆日文標題 100% 精確映射。`);
    }
  } catch(e) {
    console.warn("⚠️ 無法獲取 bangumi-data，將退回使用 ACG Secrets 與原生標題。");
  }

  for (let year = START_YEAR; year <= END_YEAR; year++) {
    for (let seasonIdx = 0; seasonIdx < 4; seasonIdx++) {
      const currentSeason = ALL_SEASONS[seasonIdx];
      
      // Time-Aware Filtering: fetch up to NEXT season
      if (year > nextSeasonYear || (year === nextSeasonYear && seasonIdx > nextSeasonIndex)) {
        // Skip silently to avoid spamming console
        continue;
      }

      console.log(`\n🔍 正在爬取: ${year} 年 ${currentSeason} 季...`);
      const acgTitlesMap = await fetchACGSecretsTitles(year, currentSeason);
      const seasonData = await fetchAniListBySeason(year, currentSeason);
      console.log(`🚀 取得 ${seasonData.length} 部動畫資料，進行本地超高速清洗...`);
      
      for (const item of seasonData) {
        const nativeTitle = item.title.native || item.title.romaji;
        const aniListId = String(item.id);
        
        let titleZh = "";
        
        // Priority 1: Manual Custom Override (人工設定校正，最高優先度)
        const overrideKey = `anilist-${item.id}`;
        const customOverride = overrideData[overrideKey] || overrideData[aniListId];
        if (customOverride && customOverride.titleZh && customOverride.source === 'manual') {
          titleZh = customOverride.titleZh;
        }

        // Priority 2: Bahamut Gamer Official Title (巴哈姆特 ACG 百科官方翻譯)
        if (!titleZh && customOverride && customOverride.titleZh && (customOverride.source === 'gamer' || (!customOverride.source && customOverride.titleZh))) {
          titleZh = customOverride.titleZh;
        }

        // Priority 3: bangumi-data exact ID or 100% Title mapping (社區開源授權對照表)
        const bgmItem = matchBangumiItem(aniListId, nativeTitle, customOverride, bgmMap, bgmTitleMap);
        if (!titleZh && bgmItem) {
          if (bgmItem.titleTranslate) {
            if (bgmItem.titleTranslate['zh-Hant']) {
              titleZh = bgmItem.titleTranslate['zh-Hant'][0];
            } else if (bgmItem.titleTranslate['zh-Hans']) {
              titleZh = bgmItem.titleTranslate['zh-Hans'][0];
            }
          }
        }
        
        // Priority 4: ACG Secrets exact string match or AI Translation
        if (!titleZh && acgTitlesMap.has(nativeTitle)) {
          titleZh = acgTitlesMap.get(nativeTitle);
        }

        // Priority 4: AI Translation Override (最後才採用 AI 翻譯)
        if (!titleZh && customOverride && customOverride.titleZh && customOverride.source === 'ai') {
          titleZh = customOverride.titleZh;
        }

        // Fallback
        if (!titleZh) {
          titleZh = nativeTitle || item.title.english || "未知動畫";
        }
        
        // Convert to Traditional Chinese
        titleZh = converter(titleZh);
        
        // AI Translation Check (only for target seasons)
        const seasonScore = getSeasonScore(year, seasonIdx);
        if (targetScores.includes(seasonScore)) {
          if (titleZh === nativeTitle || titleZh === item.title.english || titleZh === "未知動畫") {
             missingTranslations.push({ id: aniListId, titleJa: nativeTitle, titleEn: item.title.english });
          }
        }

        // Smart Cover Image Strategy (Priority: Bahamut > Bilibili > AniList)
        let finalCover = "";
        let gamerSite = null;
        let bilibiliSite = null;
        if (bgmItem) {
          const sites = bgmItem.sites || [];
          gamerSite = sites.find(s => s.site === 'gamer');
          bilibiliSite = sites.find(s => s.site === 'bilibili_tw') || 
                         sites.find(s => s.site === 'bilibili_hk_mo_tw') || 
                         sites.find(s => s.site === 'bilibili');
        }
        
        if (gamerSite && gamerSite.id) {
          finalCover = await getBahamutCover(gamerSite.id) || "";
        }
        
        if (!finalCover) {
          finalCover = item.coverImage?.extraLarge || item.coverImage?.large || "";
        }
        
        // Genres & Tags
        let genres = (item.genres || []).map(g => genreMap[g] || g);
        const isAdult = item.tags?.some(t => (t.name === 'Nudity' || t.name === 'Sexual Content') && t.rank > 75) || genres.includes('福利');
        if (isAdult && !genres.includes('福利')) {
          genres.push('福利');
        }

        const isIsekai = item.tags?.some(t => t.name === 'Isekai' && t.rank >= 75);
        if (isIsekai && !genres.includes('異世界')) {
          genres.push('異世界');
        }

        const hasSuperPower = item.tags?.some(t => t.name === 'Super Power' && t.rank >= 75);
        if (hasSuperPower && !genres.includes('超能力')) {
          genres.push('超能力');
        }

        const seasonMap = { 'WINTER': '冬', 'SPRING': '春', 'SUMMER': '夏', 'FALL': '秋' };
        const fullId = `anilist-${item.id}`;
        if (!existingIds.has(fullId)) {
          newlyAddedAnimes.push({ id: fullId, title: titleZh });
        }

        const streamings = [];
        if (bgmItem && bgmItem.sites) {
          const regionPriority = { '台灣': 1, '港澳台': 2, '亞洲': 3, '全球': 4, '中國': 5, '中國大陸': 5, '大陸': 5, '日本': 6 };
          const blockedSites = customOverride?.blockedSites || [];
          bgmItem.sites.forEach(s => {
            if (blockedSites.includes(s.site)) return;
            const siteConfig = STREAMING_SITE_NAMES[s.site];
            if (siteConfig) {
              streamings.push({
                site: s.site,
                name: siteConfig.name,
                region: siteConfig.region,
                url: getStreamingUrl(s, bgmSiteMeta)
              });
            }
          });
          const mergedStreamings = normalizeAndMergeStreamings(streamings);
        }

        const aniListCover = item.coverImage?.extraLarge || item.coverImage?.large || "";
        const gamerCover = (finalCover && finalCover !== aniListCover) ? finalCover : "";

        finalAnimeList.push({
          id: fullId,
          titleZh,
          titleEn: item.title.english || "",
          titleJa: nativeTitle || "",
          coverImageGamer: gamerCover,
          coverImageAniList: aniListCover,
          startDate: item.startDate || null,
          yearSeason: `${year} ${seasonMap[currentSeason]}`,
          genres,
          ...(streamings.length > 0 && { streamings: normalizeAndMergeStreamings(streamings) })
        });
      }
      
      // Delay to avoid AniList & ACG Secrets Rate Limit (429)
      await new Promise(r => setTimeout(r, 1000));
    }
  }

  // Ensure public directory exists
  const publicDir = path.dirname(DATA_FILE);
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  let translatedCount = 0;
  if (missingTranslations.length > 0 && process.env.GEMINI_API_KEY) {
    console.log(`\n🤖 發現 ${missingTranslations.length} 部近期動畫缺乏翻譯，開始呼叫 Gemini AI...`);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const promptText = fs.readFileSync(path.join(process.cwd(), 'scraper', 'ai_translate_prompt.md'), 'utf-8');
      let response;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          response = await ai.models.generateContent({
            model: 'gemini-3.5-flash',
            contents: `${promptText}\n\n輸入清單：\n${JSON.stringify(missingTranslations, null, 2)}`
          });
          break;
        } catch (apiErr) {
          if (attempt === 3) throw apiErr;
          console.warn(`⚠️ Gemini API 請求遇到暫時性忙碌 (Attempt ${attempt}/3)，等待 3 秒後重試...`);
          await new Promise(r => setTimeout(r, 3000));
        }
      }
      const rawAiText = (typeof response.text === 'function' ? response.text() : response.text) || '';
      const aiText = rawAiText.replace(/```json/g, '').replace(/```/g, '').trim();
      const aiResult = JSON.parse(aiText);
      
      let overrideChanged = false;
      aiResult.forEach(res => {
        if (res.titleZh) {
          const target = finalAnimeList.find(a => a.id === `anilist-${res.id}`);
          if (target) {
            target.titleZh = res.titleZh;
          }
          const ak = res.id.toString().startsWith('anilist-') ? res.id : `anilist-${res.id}`;
          if (!overrideData[ak]) overrideData[ak] = {};
          if (overrideData[ak].titleZh !== res.titleZh || overrideData[ak].source !== 'ai') {
            overrideData[ak].titleZh = res.titleZh;
            overrideData[ak].source = 'ai';
            overrideChanged = true;
            translatedCount++;
            aiTranslatedAnimes.push(res.titleZh);
            
            // 如果這部剛好是新增的，順便把清單裡的名字也改成翻譯後的
            const newlyAddedTarget = newlyAddedAnimes.find(a => a.id === `anilist-${res.id}`);
            if (newlyAddedTarget) newlyAddedTarget.title = res.titleZh;
          }
        }
      });
      if (overrideChanged) {
        fs.writeFileSync(overridePath, JSON.stringify(overrideData, null, 2), 'utf-8');
        console.log(`✅ AI 翻譯完成，更新了 ${translatedCount} 筆資料至 custom_override.json`);
      }
    } catch (err) {
      console.error("❌ AI 翻譯失敗:", err);
    }
  } else if (missingTranslations.length > 0) {
    console.log(`\n⚠️ 發現 ${missingTranslations.length} 部近期動畫缺乏翻譯，但未設定 GEMINI_API_KEY，跳過 AI 翻譯。`);
  }

  // 基於 ID 比對合併：以本地舊資料為基礎，新爬取資料更新 existing 項目並追加新番；漏爬舊番完整保留
  const crawledCount = finalAnimeList.length;
  if (oldDataMap && oldDataMap.size > 0) {
    const mergedMap = new Map(oldDataMap); // 1. 先放入所有舊資料作為底層
    finalAnimeList.forEach(item => {
      const oldItem = oldDataMap.get(item.id);
      if (oldItem) {
        if (oldItem.coverImageGamer) item.coverImageGamer = oldItem.coverImageGamer;
        if (oldItem.coverImageAniList) item.coverImageAniList = oldItem.coverImageAniList;
      }
      mergedMap.set(item.id, item);        // 2. 新爬取資料覆蓋更新
    });
    finalAnimeList = Array.from(mergedMap.values());
  }

  // 為所有項目（包含舊有資料庫項目）自動補充 bangumi-data 授權連結 (支援 ID 與 100% 日文標題對應)
  if (bgmMap.size > 0 || bgmTitleMap.size > 0) {
    finalAnimeList.forEach(item => {
      const aniListId = String(item.id).replace('anilist-', '');
      const customOverride = overrideData[item.id] || overrideData[aniListId];
      const bgmItem = matchBangumiItem(aniListId, item.titleJa, customOverride, bgmMap, bgmTitleMap);
      if ((!item.streamings || item.streamings.length === 0) && bgmItem) {
        const streamings = [];
        const blockedSites = customOverride?.blockedSites || [];
        if (bgmItem.sites) {
          bgmItem.sites.forEach(s => {
            if (blockedSites.includes(s.site)) return;
            const meta = bgmSiteMeta[s.site];
            if (meta && (meta.type === 'onair' || s.site === 'gamer' || s.site === 'gamer_hk')) {
              const urlTemplate = meta.urlTemplate || '';
              const url = urlTemplate.replace('{{id}}', s.id) || s.url || '';
              if (url) {
                let region = '全球/日本';
                if (meta.regions && meta.regions.includes('TW')) region = '台灣';
                else if (meta.regions && meta.regions.includes('HK')) region = '港澳';
                else if (meta.regions && meta.regions.includes('CN')) region = '中國';
                streamings.push({ site: s.site, name: meta.title, region, url });
              }
            }
          });
        }
        if (streamings.length > 0) item.streamings = normalizeAndMergeStreamings(streamings);
      }
    });
  }

  await washGamerStreamings(finalAnimeList, newlyAddedAnimes);

  const summaryPath = path.join(process.cwd(), 'scraper', 'run_summary.txt');
  let summaryContent = `【動畫爬蟲】完成。本次實際抓取 ${crawledCount} 筆，經 ID 比對合併後資料庫共 ${finalAnimeList.length} 筆，新增資料 ${newlyAddedAnimes.length} 筆，AI 翻譯 ${translatedCount} 筆。\n`;
  if (newlyAddedAnimes.length > 0) {
    summaryContent += `🌟 新增動畫：\n- ${newlyAddedAnimes.map(a => a.title).join('\n- ')}\n`;
  }
  if (aiTranslatedAnimes.length > 0) {
    summaryContent += `🤖 AI 翻譯動畫：\n- ${aiTranslatedAnimes.join('\n- ')}\n`;
  }
  fs.writeFileSync(summaryPath, summaryContent + '\n', 'utf-8');

  console.log('\n=====================================');
  console.log('📋 本次爬蟲執行結果總結：');
  console.log(summaryContent.trim());
  console.log('=====================================\n');

  // Sort by date descending (Year DESC, Season priority)
  // Autumn(4) > Summer(3) > Spring(2) > Winter(1) to match frontend logic
  const seasonOrder = { '秋': 4, '夏': 3, '春': 2, '冬': 1 };
  const parseSeasonScore = (yearSeason) => {
    const parts = yearSeason.split(' ');
    if (parts.length !== 2) return 0;
    const year = parseInt(parts[0], 10);
    const season = seasonOrder[parts[1]] || 0;
    return year * 10 + season;
  };
  finalAnimeList.sort((a, b) => parseSeasonScore(b.yearSeason) - parseSeasonScore(a.yearSeason));

  // 嚴格確保全庫所有條目不含有舊版的 coverImage 或 show 屬性，並將地區統一為「中國」
  finalAnimeList.forEach(item => {
    delete item.coverImage;
    delete item.preferredCoverImage;
    delete item.show;
    if (item.streamings) {
      item.streamings.forEach(st => {
        if (st.region === '中國大陸' || st.region === '大陸') st.region = '中國';
      });
    }
  });

  fs.writeFileSync(DATA_FILE, JSON.stringify(finalAnimeList, null, 2), 'utf-8');
  console.log(`\n✨ 抓取與清洗完成！極速處理完畢。共 ${finalAnimeList.length} 筆資料已儲存至 ${DATA_FILE}`);
}

main();

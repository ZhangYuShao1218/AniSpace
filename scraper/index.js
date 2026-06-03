import fs from 'fs';
import path from 'path';
import * as OpenCC from 'opencc-js';

const DATA_FILE = path.join(process.cwd(), 'public', 'anime_data.json');
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

  console.log('📦 正在下載 bangumi-data 字典檔...');
  let bgmMap = new Map(); // aniListId -> translation Object
  try {
    const res = await fetch("https://raw.githubusercontent.com/bangumi-data/bangumi-data/master/dist/data.json");
    if (res.ok) {
      const data = await res.json();
      (data.items || []).forEach(item => {
        const aniListSite = item.sites?.find(s => s.site === 'aniList');
        if (aniListSite && aniListSite.id) {
          bgmMap.set(aniListSite.id, item);
        }
      });
      console.log(`✅ 字典檔載入完成，共建立 ${bgmMap.size} 筆精確映射。`);
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
        
        // Priority 1: bangumi-data exact ID mapping
        if (bgmMap.has(aniListId)) {
          const bgmItem = bgmMap.get(aniListId);
          if (bgmItem.titleTranslate) {
            if (bgmItem.titleTranslate['zh-Hant']) {
              titleZh = bgmItem.titleTranslate['zh-Hant'][0];
            } else if (bgmItem.titleTranslate['zh-Hans']) {
              titleZh = bgmItem.titleTranslate['zh-Hans'][0];
            }
          }
        }
        
        // Priority 2: ACG Secrets exact string match
        if (!titleZh && acgTitlesMap.has(nativeTitle)) {
          titleZh = acgTitlesMap.get(nativeTitle);
        }

        // Fallback
        if (!titleZh) {
          titleZh = nativeTitle || item.title.english || "未知動畫";
        }
        
        // Convert to Traditional Chinese
        titleZh = converter(titleZh);
        
        // Smart Cover Image Strategy (Priority: Bahamut > Bilibili > AniList)
        let finalCover = "";
        let gamerSite = null;
        let bilibiliSite = null;
        if (bgmMap.has(aniListId)) {
          const sites = bgmMap.get(aniListId).sites || [];
          gamerSite = sites.find(s => s.site === 'gamer');
          bilibiliSite = sites.find(s => s.site === 'bilibili_tw') || 
                         sites.find(s => s.site === 'bilibili_hk_mo_tw') || 
                         sites.find(s => s.site === 'bilibili');
        }
        
        if (gamerSite && gamerSite.id) {
          finalCover = await getBahamutCover(gamerSite.id) || "";
        }
        
        if (!finalCover && bilibiliSite && bilibiliSite.id) {
          finalCover = await getBilibiliCover(bilibiliSite.id) || "";
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
        finalAnimeList.push({
          id: `anilist-${item.id}`,
          titleZh,
          titleEn: item.title.english || "",
          titleJa: nativeTitle || "",
          coverImage: finalCover,
          coverImageAniList: item.coverImage?.extraLarge || item.coverImage?.large || "",
          yearSeason: `${year} ${seasonMap[currentSeason]}`,
          genres
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

  fs.writeFileSync(DATA_FILE, JSON.stringify(finalAnimeList, null, 2), 'utf-8');
  console.log(`\n✨ 抓取與清洗完成！極速處理完畢。共 ${finalAnimeList.length} 筆資料已儲存至 ${DATA_FILE}`);
}

main();

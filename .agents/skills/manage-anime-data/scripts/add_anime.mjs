/**
 * 新增動畫至資料庫腳本
 * 用法: node .agents/skills/manage-anime-data/scripts/add_anime.mjs <AniList數字ID> [自訂繁中譯名]
 * 
 * 範例:
 *   node .agents/skills/manage-anime-data/scripts/add_anime.mjs 4654
 *   node .agents/skills/manage-anime-data/scripts/add_anime.mjs 4654 "魔法禁書目錄"
 * 
 * 流程：
 *   1. 去重檢查（確認資料庫中不存在該 ID）
 *   2. 查詢 bangumi-data 字典（翻譯 + 全部串流平台）
 *   3. 查詢 AniList API（基礎資料 + 封面）
 *   4. 建立條目、正規化合併串流、排序、寫入
 *   5. 驗證
 */
import fs from 'fs';
import path from 'path';
import { normalizeAndMergeStreamings } from '../../../../scraper/scraper_utils.mjs';

const DATA_FILE = path.join(process.cwd(), 'public', 'anime_data.json');
const OVERRIDE_FILE = path.join(process.cwd(), 'public', 'custom_override.json');

const GENRE_MAP = {
  // English to Standard Traditional Chinese
  'Action': '動作', 'Adventure': '冒險', 'Comedy': '喜劇', 'Drama': '劇情',
  'Fantasy': '奇幻', 'Horror': '恐怖', 'Mystery': '懸疑', 'Romance': '愛情',
  'Sci-Fi': '科幻', 'Slice of Life': '日常', 'Sports': '運動', 'Supernatural': '超自然',
  'Suspense': '懸疑', 'Award Winning': '獲獎', 'Avant Garde': '前衛', 'Boys Love': '耽美',
  'Girls Love': '百合', 'Gourmet': '美食', 'Mecha': '機甲', 'Music': '音樂', 'Psychological': '心理',
  'Thriller': '驚悚', 'Mahou Shoujo': '魔法少女', 'Hentai': '福利', 'Ecchi': '福利',
  'Erotica': '福利', 'Isekai': '異世界', 'Super Power': '超能力',
  'School': '校園', 'Overpowered Main Character': '龍傲天', 'Tragedy': '憂鬱',
  'Dark Fantasy': '憂鬱', 'Villainess': '惡役千金', 'Food': '美食',
  // Chinese synonyms
  '搞笑': '喜劇', '戀愛': '愛情', '競技': '運動', '紳士': '福利', '魔法': '奇幻',
  '學園': '校園', '惡役': '惡役千金', '胃痛': '憂鬱'
};

const STREAMING_SITE_NAMES = {
  gamer:    { name: '動畫瘋', region: '台灣' },
  gamer_hk: { name: '動畫瘋', region: '港澳' },
  muse_tw:  { name: '木棉花 YouTube', region: '台灣' },
  muse_hk:  { name: '木棉花 YouTube', region: '港澳' },
  ani_one:  { name: 'Ani-One YouTube', region: '亞洲' },
  ani_one_asia: { name: 'Ani-One Asia', region: '亞洲' },
  tropics:  { name: '回歸線娛樂', region: '台灣' },
  kktv:     { name: 'KKTV', region: '台灣' },
  linetv:   { name: 'LINE TV', region: '台灣' },
  friday:   { name: 'friDay影音', region: '台灣' },
  myvideo:  { name: 'MyVideo', region: '台灣' },
  hamivideo: { name: 'Hami Video', region: '台灣' },
  bilibili_tw:      { name: 'Bilibili', region: '台灣' },
  bilibili_hk_mo_tw: { name: 'Bilibili', region: '港澳台' },
  bilibili_hk_mo:   { name: 'Bilibili', region: '港澳' },
  bilibili: { name: 'Bilibili', region: '中國' },
  iqiyi:    { name: '愛奇藝', region: '中國' },
  netflix:  { name: 'Netflix', region: '全球' },
  disneyplus: { name: 'Disney+', region: '全球' },
  prime:    { name: 'Prime Video', region: '全球' },
  prime_video: { name: 'Prime Video', region: '全球' },
  amazon_prime_video: { name: 'Prime Video', region: '全球' },
  crunchyroll: { name: 'Crunchyroll', region: '全球' },
  youtube:  { name: 'YouTube', region: '亞洲' },
  viu:      { name: 'Viu', region: '港澳' },
  mytv:     { name: 'myTV SUPER', region: '港澳' },
  abema:    { name: 'ABEMA', region: '日本' },
  nicovideo: { name: 'NicoNico', region: '日本' },
  danime:   { name: 'd動畫商城', region: '日本' },
  unext:    { name: 'U-NEXT', region: '日本' }
};

const SEASON_ORDER = { '秋': 4, '夏': 3, '春': 2, '冬': 1 };

function getYearSeason(year, month) {
  if (month >= 10) return `${year} 秋`;
  if (month >= 7) return `${year} 夏`;
  if (month >= 4) return `${year} 春`;
  return `${year} 冬`;
}

function parseSeasonScore(ys) {
  if (!ys) return 0;
  const p = ys.split(' ');
  return p.length === 2 ? parseInt(p[0], 10) * 10 + (SEASON_ORDER[p[1]] || 0) : 0;
}

// ===== 開始執行 =====

const anilistNumericId = process.argv[2];
const customTitle = process.argv[3] || null;

if (!anilistNumericId || !/^\d+$/.test(anilistNumericId)) {
  console.error('❌ 請提供 AniList 數字 ID 作為第一個參數。');
  console.error('   用法: node add_anime.mjs <AniList數字ID> [自訂繁中譯名]');
  process.exit(1);
}

const TARGET_ID = `anilist-${anilistNumericId}`;
const animeData = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
const overrideData = JSON.parse(fs.readFileSync(OVERRIDE_FILE, 'utf8'));

// Step 1: 去重檢查
if (animeData.some(a => a.id === TARGET_ID)) {
  console.error(`⚠️ ${TARGET_ID} 已存在於資料庫中，跳過新增。`);
  process.exit(0);
}

console.log(`🚀 開始新增動畫 ${TARGET_ID} 至資料庫\n`);

// Step 2: 查詢 bangumi-data 字典
console.log('📦 [Step 2] 查詢 bangumi-data 字典...');
let bgmItem = null;
let bgmSiteMeta = {};

try {
  const bgmRes = await fetch("https://raw.githubusercontent.com/bangumi-data/bangumi-data/master/dist/data.json");
  if (bgmRes.ok) {
    const bgmData = await bgmRes.json();
    bgmSiteMeta = bgmData.siteMeta || {};
    bgmItem = (bgmData.items || []).find(item => {
      const aniSite = item.sites?.find(s => s.site === 'aniList');
      return aniSite && String(aniSite.id) === anilistNumericId;
    });
    if (bgmItem) {
      console.log(`  ✅ 找到: ${bgmItem.title}`);
      if (bgmItem.titleTranslate) {
        const zhHant = bgmItem.titleTranslate['zh-Hant'];
        const zhHans = bgmItem.titleTranslate['zh-Hans'];
        console.log(`  繁中: ${zhHant || '無'} | 簡中: ${zhHans || '無'}`);
      }
    } else {
      console.log('  ℹ️ bangumi-data 無此動畫紀錄。');
    }
  }
} catch (e) {
  console.warn('  ⚠️ 無法下載 bangumi-data:', e.message);
}

// Step 3: 查詢 AniList API
console.log('\n📡 [Step 3] 查詢 AniList API...');
let anilistData = null;

try {
  const query = `
    query ($id: Int) {
      Media(id: $id, type: ANIME) {
        id
        title { romaji english native }
        startDate { year month day }
        genres
        tags { name rank }
        coverImage { large extraLarge }
      }
    }
  `;
  const res = await fetch('https://graphql.anilist.co', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify({ query, variables: { id: parseInt(anilistNumericId, 10) } })
  });
  const json = await res.json();
  if (json.data && json.data.Media) {
    anilistData = json.data.Media;
    console.log(`  ✅ 取得: ${anilistData.title.native} / ${anilistData.title.english}`);
    console.log(`  封面: ${anilistData.coverImage.extraLarge}`);
    console.log(`  分類: ${anilistData.genres.join(', ')}`);
    console.log(`  開播: ${anilistData.startDate.year}/${anilistData.startDate.month}/${anilistData.startDate.day}`);
  } else {
    console.log('  ⚠️ AniList API 未回傳資料（可能暫時停機），使用 bangumi-data 資訊。');
  }
} catch (e) {
  console.log('  ⚠️ AniList API 請求失敗:', e.message);
}

// 必須至少有 bangumi-data 或 AniList 其中一個資料來源
if (!bgmItem && !anilistData) {
  console.error('❌ bangumi-data 與 AniList API 皆無法取得此動畫資料，無法新增。');
  process.exit(1);
}

// Step 4: 決定各欄位值
console.log('\n🔧 [Step 4] 建立資料條目...');

// 標題
let titleJa = anilistData?.title?.native || bgmItem?.title || '';
let titleEn = anilistData?.title?.english || '';
let titleZh = customTitle || '';

if (!titleZh && bgmItem?.titleTranslate) {
  const zhHant = bgmItem.titleTranslate['zh-Hant'];
  const zhHans = bgmItem.titleTranslate['zh-Hans'];
  if (zhHant && zhHant.length > 0) titleZh = zhHant[0];
  else if (zhHans && zhHans.length > 0) titleZh = zhHans[0];
}
if (!titleZh) titleZh = titleJa || titleEn || '未知動畫';

// 開播日期與季度
let startDate = anilistData?.startDate || null;
let yearSeason = '';
if (startDate && startDate.year && startDate.month) {
  yearSeason = getYearSeason(startDate.year, startDate.month);
} else if (bgmItem?.begin) {
  const d = new Date(bgmItem.begin);
  startDate = { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate() };
  yearSeason = getYearSeason(startDate.year, startDate.month);
}

// 封面
const coverImage = anilistData?.coverImage?.extraLarge || anilistData?.coverImage?.large || '';

// Genre
let genres = [];
if (anilistData?.genres) {
  genres = anilistData.genres.map(g => GENRE_MAP[g] || g);
  // 自動偵測 tag
  const tags = anilistData.tags || [];
  if (tags.some(t => t.name === 'Isekai' && t.rank >= 75) && !genres.includes('異世界')) genres.push('異世界');
  if (tags.some(t => t.name === 'Super Power' && t.rank >= 75) && !genres.includes('超能力')) genres.push('超能力');
  if (tags.some(t => (t.name === 'Nudity' || t.name === 'Sexual Content') && t.rank > 75) && !genres.includes('福利')) genres.push('福利');
  if (tags.some(t => t.name === 'School' && t.rank >= 75) && !genres.includes('校園')) genres.push('校園');
  if (tags.some(t => t.name === 'Overpowered Main Character' && t.rank >= 75) && !genres.includes('龍傲天')) genres.push('龍傲天');
  if (tags.some(t => (t.name === 'Tragedy' || t.name === 'Dark Fantasy') && t.rank >= 75) && !genres.includes('憂鬱')) genres.push('憂鬱');
  if (tags.some(t => t.name === 'Villainess' && t.rank >= 75) && !genres.includes('惡役千金')) genres.push('惡役千金');
  if (tags.some(t => t.name === 'Food' && t.rank >= 75) && !genres.includes('美食')) genres.push('美食');
  genres = Array.from(new Set(genres)).filter(Boolean).sort();
}

// 串流平台（從 bangumi-data 取得全部 onair 平台）
let streamings = [];
if (bgmItem?.sites) {
  bgmItem.sites.forEach(s => {
    const meta = bgmSiteMeta[s.site] || {};
    const siteConfig = STREAMING_SITE_NAMES[s.site];
    if (!siteConfig && meta.type !== 'onair') return; // 僅收錄播放平台
    if (!siteConfig) return; // 未在對照表中的平台跳過

    const urlTemplate = meta.urlTemplate || '';
    const url = urlTemplate ? urlTemplate.replace('{{id}}', s.id) : '';
    if (url) {
      streamings.push({
        site: s.site,
        name: siteConfig.name,
        region: siteConfig.region,
        url
      });
    }
  });
  streamings = normalizeAndMergeStreamings(streamings);
}

// 建立條目
const newAnime = {
  id: TARGET_ID,
  titleZh,
  titleEn,
  titleJa,
  coverImageAniList: coverImage,
  coverImageGamer: "",
  startDate,
  yearSeason,
  genres,
  ...(streamings.length > 0 && { streamings })
};

animeData.push(newAnime);

// Override
overrideData[TARGET_ID] = overrideData[TARGET_ID] || {};
overrideData[TARGET_ID].titleZh = titleZh;
overrideData[TARGET_ID].source = 'manual';

// Step 5: 排序
animeData.sort((a, b) => parseSeasonScore(b.yearSeason) - parseSeasonScore(a.yearSeason));

// 寫入
fs.writeFileSync(DATA_FILE, JSON.stringify(animeData, null, 2), 'utf8');
fs.writeFileSync(OVERRIDE_FILE, JSON.stringify(overrideData, null, 2), 'utf8');

// Step 6: 驗證
console.log('\n--- 驗證結果 ---\n');
const verifyData = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
const verifyOverride = JSON.parse(fs.readFileSync(OVERRIDE_FILE, 'utf8'));
const verifyItem = verifyData.find(a => a.id === TARGET_ID);
const verifyOv = verifyOverride[TARGET_ID];

if (verifyItem && verifyOv) {
  console.log(`  ✅ ID: ${verifyItem.id}`);
  console.log(`  ✅ 譯名: ${verifyItem.titleZh}`);
  console.log(`  ✅ 日文: ${verifyItem.titleJa}`);
  console.log(`  ✅ 英文: ${verifyItem.titleEn}`);
  console.log(`  ✅ 季度: ${verifyItem.yearSeason}`);
  console.log(`  ✅ Genre: ${verifyItem.genres.join(', ')}`);
  console.log(`  ✅ 串流: ${verifyItem.streamings ? verifyItem.streamings.length + ' 個平台' : '無'}`);
  if (verifyItem.streamings) {
    verifyItem.streamings.forEach(st => console.log(`     📺 ${st.name} [${st.region}]`));
  }
  console.log(`  ✅ Override: "${verifyOv.titleZh}" [🔒 ${verifyOv.source}]`);
  console.log(`\n📊 資料庫總筆數: ${verifyData.length}`);
  console.log('🌟 新增成功！驗證全數通過！');
} else {
  console.error('❌ 驗證失敗：寫入後找不到該條目。');
  process.exit(1);
}

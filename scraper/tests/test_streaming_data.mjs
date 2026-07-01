import fs from 'fs';
import path from 'path';

const DATA_FILE = path.join(process.cwd(), 'public', 'anime_data.json');
const OUTPUT_FILE = path.join(process.cwd(), 'scraper', 'tests', 'streaming_test_3years.json');

const STREAMING_SITE_NAMES = {
  gamer: { name: '巴哈姆特動畫瘋', region: 'TW' },
  kktv: { name: 'KKTV', region: 'TW' },
  linetv: { name: 'LINE TV', region: 'TW' },
  friday: { name: 'friDay影音', region: 'TW' },
  myvideo: { name: 'MyVideo', region: 'TW' },
  hamivideo: { name: 'Hami Video', region: 'TW' },
  bilibili_tw: { name: 'Bilibili (港澳台)', region: 'TW/HK/MO' },
  bilibili_hk_mo_tw: { name: 'Bilibili (港澳台)', region: 'TW/HK/MO' },
  bilibili: { name: 'Bilibili (大陸)', region: 'CN' },
  iqiyi: { name: '愛奇藝', region: 'TW/SEA/CN' },
  netflix: { name: 'Netflix', region: 'GLOBAL' },
  disneyplus: { name: 'Disney+', region: 'GLOBAL' },
  prime_video: { name: 'Prime Video', region: 'GLOBAL' },
  amazon_prime_video: { name: 'Prime Video', region: 'GLOBAL' },
  crunchyroll: { name: 'Crunchyroll', region: 'GLOBAL/US/EU' },
  youtube: { name: 'YouTube 正版頻道', region: 'GLOBAL/ASIA' },
  aniplus: { name: 'ANIPLUS', region: 'ASIA' },
  abema: { name: 'ABEMA', region: 'JP' },
  nicovideo: { name: 'NicoNico', region: 'JP' }
};

function getStreamingUrl(site, id, url) {
  if (url) return url;
  switch (site) {
    case 'gamer': return `https://ani.gamer.com.tw/animeVideo.php?sn=${id}`;
    case 'kktv': return `https://www.kktv.me/titles/${id}`;
    case 'linetv': return `https://www.linetv.tw/drama/${id}`;
    case 'netflix': return `https://www.netflix.com/title/${id}`;
    case 'bilibili_tw':
    case 'bilibili_hk_mo_tw':
    case 'bilibili': return `https://www.bilibili.com/bangumi/media/md${id}`;
    case 'iqiyi': return `https://www.iq.com/album/${id}`;
    case 'crunchyroll': return `https://www.crunchyroll.com/series/${id}`;
    default: return `ID: ${id}`;
  }
}

async function runTest() {
  console.log('📦 1. 讀取本地資料庫 (anime_data.json)...');
  const allAnime = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));

  // 過濾近三年：2024, 2025, 2026
  const targetYears = ['2024', '2025', '2026'];
  const recentAnime = allAnime.filter(item => {
    const yearMatch = item.yearSeason?.match(/^(\d{4})/);
    return yearMatch && targetYears.includes(yearMatch[1]);
  });

  console.log(`🎯 近三年 (2024~2026) 動畫總計: ${recentAnime.length} 部`);

  console.log('🌐 2. 下載最新的 bangumi-data 字典檔...');
  const res = await fetch("https://raw.githubusercontent.com/bangumi-data/bangumi-data/master/dist/data.json");
  const bgmData = await res.json();

  const bgmMap = new Map();
  (bgmData.items || []).forEach(item => {
    const aniListSite = item.sites?.find(s => s.site === 'aniList');
    if (aniListSite && aniListSite.id) {
      bgmMap.set(String(aniListSite.id), item);
    }
  });
  console.log(`✅ 字典檔載入成功，建立 ${bgmMap.size} 筆映射。`);

  console.log('🔍 3. 正在比對並生成串流平台資料...');
  let matchedCount = 0;
  const platformStats = {};
  const testResults = [];

  for (const anime of recentAnime) {
    const aniListId = anime.id.replace('anilist-', '');
    const bgmItem = bgmMap.get(aniListId);
    
    const streamings = [];
    if (bgmItem && bgmItem.sites) {
      bgmItem.sites.forEach(s => {
        const siteConfig = STREAMING_SITE_NAMES[s.site];
        if (siteConfig) {
          streamings.push({
            siteCode: s.site,
            platformName: siteConfig.name,
            region: siteConfig.region,
            url: getStreamingUrl(s.site, s.id, s.url)
          });

          platformStats[siteConfig.name] = (platformStats[siteConfig.name] || 0) + 1;
        }
      });
    }

    if (streamings.length > 0) {
      matchedCount++;
    }

    testResults.push({
      id: anime.id,
      titleZh: anime.titleZh,
      titleJa: anime.titleJa,
      yearSeason: anime.yearSeason,
      hasStreaming: streamings.length > 0,
      streamings
    });
  }

  // 確保 output 目錄存在
  const outputDir = path.dirname(OUTPUT_FILE);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(testResults, null, 2), 'utf-8');

  console.log('\n==================================================');
  console.log('📊 近三年 (2024~2026) 串流資料覆蓋率分析報告');
  console.log('==================================================');
  console.log(`📁 測試結果檔案已輸出至: ${OUTPUT_FILE} (未改動原檔案)`);
  console.log(`🎬 評估動畫總數: ${recentAnime.length} 部`);
  console.log(`✅ 成功比對到正版管道: ${matchedCount} 部 (${((matchedCount / recentAnime.length) * 100).toFixed(1)}%)`);
  console.log(`❌ 未比對到管道: ${recentAnime.length - matchedCount} 部\n`);

  console.log('📺 各大正版平台收錄數量排行 (可複選):');
  const sortedPlatforms = Object.entries(platformStats).sort((a, b) => b[1] - a[1]);
  for (const [platform, count] of sortedPlatforms) {
    console.log(`   - ${platform.padEnd(16, ' ')} : ${count} 部`);
  }

  console.log('\n🌟 抽樣 10 部知名作品驗證結果:');
  const samples = testResults.filter(r => r.hasStreaming).slice(0, 10);
  for (const sample of samples) {
    const platforms = sample.streamings.map(s => `[${s.platformName}]`).join(' ');
    console.log(`   🔸 ${sample.titleZh} (${sample.yearSeason}) -> ${platforms}`);
  }
  console.log('==================================================\n');
}

runTest().catch(console.error);

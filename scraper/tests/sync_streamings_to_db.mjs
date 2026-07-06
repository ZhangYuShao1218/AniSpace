import fs from 'fs';
import path from 'path';

const DATA_FILE = path.join(process.cwd(), 'public', 'anime_data.json');

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

async function sync() {
  console.log('📦 讀取 public/anime_data.json...');
  const allAnime = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));

  console.log('🌐 下載最新的 bangumi-data 字典檔...');
  const res = await fetch("https://raw.githubusercontent.com/bangumi-data/bangumi-data/master/dist/data.json");
  const bgmData = await res.json();
  const bgmSiteMeta = bgmData.siteMeta || {};

  const bgmMap = new Map();
  (bgmData.items || []).forEach(item => {
    const aniListSite = item.sites?.find(s => s.site === 'aniList');
    if (aniListSite && aniListSite.id) {
      bgmMap.set(String(aniListSite.id), item);
    }
  });

  let updatedCount = 0;
  const regionPriority = { '台灣': 1, '港澳台': 2, '亞洲': 3, '全球': 4, '中國': 5, '中國大陸': 5, '大陸': 5, '日本': 6 };

  for (const anime of allAnime) {
    const aniListId = anime.id.replace('anilist-', '');
    const bgmItem = bgmMap.get(aniListId);
    
    const streamings = [];
    if (bgmItem && bgmItem.sites) {
      bgmItem.sites.forEach(s => {
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
      streamings.sort((a, b) => (regionPriority[a.region] || 99) - (regionPriority[b.region] || 99));
    }

    if (streamings.length > 0) {
      anime.streamings = streamings;
      updatedCount++;
    } else {
      delete anime.streamings;
    }
  }

  fs.writeFileSync(DATA_FILE, JSON.stringify(allAnime, null, 2), 'utf-8');
  console.log(`✅ 同步完成！共 ${allAnime.length} 部動畫，其中 ${updatedCount} 部已更新正確的官方授權 URL。`);
}

sync().catch(console.error);

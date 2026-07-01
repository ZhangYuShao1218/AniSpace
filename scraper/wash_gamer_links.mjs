import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
import { resolveGamerStreamingUrl, resolveGamerInfo } from './scraper_utils.mjs';

const DATA_FILE = path.join(process.cwd(), 'public', 'anime_data.json');
const GAMER_CACHE_FILE = path.join(process.cwd(), 'scraper', 'gamer_url_cache.json');
const OVERRIDE_FILE = path.join(process.cwd(), 'public', 'custom_override.json');

export async function washGamerStreamings(animeList, newlyAddedAnimes = [], options = {}) {
  console.log('\n🔍 開始執行增量式動畫瘋網址洗滌與快取檢查...');
  let gamerCache = {};
  if (fs.existsSync(GAMER_CACHE_FILE)) {
    try {
      gamerCache = JSON.parse(fs.readFileSync(GAMER_CACHE_FILE, 'utf-8'));
    } catch (e) {
      gamerCache = {};
    }
  }

  let newlyWashedCount = 0;
  const newlyAddedIdSet = new Set(newlyAddedAnimes.map(a => a.id));
  const unwashedGamerItems = [];
  const isFullWash = options.fullWash || process.env.FULL_WASH === 'true' || process.argv.includes('--full-wash');

  animeList.forEach(item => {
    if (item.streamings && item.streamings.length > 0) {
      item.streamings.forEach(st => {
        if (st.site === 'gamer' || st.site === 'gamer_hk') {
          // 1. 如果 url 已經是動畫瘋播放頁面 (ani.gamer.com.tw)，直接記錄快取，不需洗滌
          if (st.url && st.url.startsWith('https://ani.gamer.com.tw')) {
            gamerCache[item.id] = st.url;
          } else if (gamerCache[item.id] && gamerCache[item.id].startsWith('https://ani.gamer.com.tw')) {
            // 2. 如果快取中已經成功洗滌為動畫瘋播放頁面，直接更新 URL
            st.url = gamerCache[item.id];
          } else {
            // 3. 只要有巴哈授權但 URL 還不是動畫瘋播放頁 (例如仍為 ACG 百科)，即使快取為 NOT_FOUND，每日仍須重新檢驗洗滌
            unwashedGamerItems.push({ item, st });
          }
        }
      });
    }
  });

  unwashedGamerItems.sort((a, b) => {
    const isNewA = newlyAddedIdSet.has(a.item.id) ? 1 : 0;
    const isNewB = newlyAddedIdSet.has(b.item.id) ? 1 : 0;
    if (isNewA !== isNewB) return isNewB - isNewA;
    const getYear = yrStr => parseInt((yrStr || '').split(' ')[0], 10) || 0;
    return getYear(b.item.yearSeason) - getYear(a.item.yearSeason);
  });

  let overrideData = {};
  let overrideUpdated = false;
  if (fs.existsSync(OVERRIDE_FILE)) {
    try { overrideData = JSON.parse(fs.readFileSync(OVERRIDE_FILE, 'utf-8')); } catch (e) {}
  }

  const processItem = async ({ item, st }) => {
    const { resolvedUrl, officialTitle, isBlocked } = await resolveGamerInfo(st.url, item.titleZh);
    if (isBlocked) {
      console.log(`⚠️ [防呆保護] 跳過 "${item.titleZh}"，保持原 URL: ${st.url}`);
      return;
    }
    if (officialTitle && officialTitle !== item.titleZh && !officialTitle.includes('系統維修') && !officialTitle.includes('巴哈姆特') && !officialTitle.includes('請稍後')) {
      console.log(`✏️ 修正譯名與巴哈官方百科一致: "${item.titleZh}" -> "${officialTitle}"`);
      item.titleZh = officialTitle;
      if (!overrideData[item.id]) overrideData[item.id] = {};
      overrideData[item.id].titleZh = officialTitle;
      overrideData[item.id].source = 'gamer';
      overrideUpdated = true;
    }
    if (resolvedUrl) {
      st.url = resolvedUrl;
      gamerCache[item.id] = resolvedUrl;
      newlyWashedCount++;
    } else {
      gamerCache[item.id] = st.url; // 保持 ACG 百科 URL
    }
  };

  const itemsToWash = unwashedGamerItems;

  if (itemsToWash.length > 0) {
    console.log(`📦【動畫瘋洗滌檢驗】偵測到 ${itemsToWash.length} 筆尚未正確綁定為動畫瘋播放連結的項目，啟動溫和單線程平穩檢閱洗滌（間隔 1 秒，防封鎖）...`);
    for (let i = 0; i < itemsToWash.length; i++) {
      await processItem(itemsToWash[i]);
      if ((i + 1) % 25 === 0 || i + 1 === itemsToWash.length) {
        console.log(`⏳ 洗滌進度: ${i + 1} / ${itemsToWash.length} (本次成功轉換: ${newlyWashedCount})`);
        fs.writeFileSync(GAMER_CACHE_FILE, JSON.stringify(gamerCache, null, 2), 'utf-8');
        if (overrideUpdated) {
          fs.writeFileSync(OVERRIDE_FILE, JSON.stringify(overrideData, null, 2), 'utf-8');
          overrideUpdated = false;
        }
      }
      await new Promise(r => setTimeout(r, 1000));
    }
    fs.writeFileSync(GAMER_CACHE_FILE, JSON.stringify(gamerCache, null, 2), 'utf-8');
    if (overrideUpdated) {
      fs.writeFileSync(OVERRIDE_FILE, JSON.stringify(overrideData, null, 2), 'utf-8');
      console.log(`✅ 已自動將修正後的巴哈官方譯名更新至 custom_override.json`);
    }
    console.log(`✅ 動畫瘋網址洗滌完成！本次新成功洗滌 ${newlyWashedCount} 筆作品。`);
  } else {
    console.log(`✅ 所有新番及快取項目皆已被正確洗滌，無需網路請求。`);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  console.log('🚀 啟動獨立動畫瘋網址洗滌程序...');
  if (!fs.existsSync(DATA_FILE)) {
    console.error('❌ 找不到 public/anime_data.json，請先執行爬蟲或同步雲端資料庫。');
    process.exit(1);
  }
  const animeData = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
  const isFullWash = process.argv.includes('--full-wash') || process.env.FULL_WASH === 'true';
  await washGamerStreamings(animeData, [], { fullWash: isFullWash });
  fs.writeFileSync(DATA_FILE, JSON.stringify(animeData, null, 2), 'utf-8');
  console.log('✨ 獨立洗滌任務完成！已寫入最新的 anime_data.json。');
}

import fs from 'fs';
import path from 'path';
import * as cheerio from 'cheerio';

const DATA_FILE = path.join(process.cwd(), 'public', 'anime_data.json');
const GAMER_CACHE_FILE = path.join(process.cwd(), 'scraper', 'gamer_url_cache.json');
const STATUS_FILE = path.join(process.cwd(), 'scraper', 'gamer_rewash_status.json');

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function rewashAll() {
  console.log('\n======================================================');
  console.log('🚀 開始全面重新洗滌檢閱動畫瘋 / ACG 百科連結');
  console.log('======================================================\n');

  // 1. Load data & cache
  const animeList = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
  let gamerCache = {};
  if (fs.existsSync(GAMER_CACHE_FILE)) {
    try { gamerCache = JSON.parse(fs.readFileSync(GAMER_CACHE_FILE, 'utf-8')); } catch (e) {}
  }
  let statusCache = {};
  if (fs.existsSync(STATUS_FILE)) {
    try { statusCache = JSON.parse(fs.readFileSync(STATUS_FILE, 'utf-8')); } catch (e) {}
  }

  // 2. Fetch bangumi-data dictionary
  console.log('📦 正在下載最新 bangumi-data 官方字典檔以取得精確 ACG 百科 ID...');
  const bgmMap = new Map();
  const titleJaMap = new Map();
  try {
    const res = await fetch("https://raw.githubusercontent.com/bangumi-data/bangumi-data/master/dist/data.json");
    if (res.ok) {
      const bgmData = await res.json();
      (bgmData.items || []).forEach(item => {
        const aniSite = item.sites?.find(s => s.site === 'aniList');
        const gamerSite = item.sites?.find(s => s.site === 'gamer');
        if (gamerSite?.id) {
          const url = `https://acg.gamer.com.tw/acgDetail.php?s=${gamerSite.id}`;
          if (aniSite?.id) bgmMap.set(`anilist-${aniSite.id}`, url);
          if (item.title) titleJaMap.set(item.title.trim(), url);
        }
      });
      console.log(`✅ 成功載入 bangumi-data，建立 ${bgmMap.size} 筆 AniList ID 及 ${titleJaMap.size} 筆日文標題映射！\n`);
    }
  } catch (e) {
    console.error('❌ 無法獲取 bangumi-data，將使用本地現存的 URL 作為基準。');
  }

  // 3. Filter gamer items
  const gamerItems = [];
  animeList.forEach(item => {
    const st = item.streamings?.find(s => s.site === 'gamer' || s.site === 'gamer_hk');
    if (st) {
      gamerItems.push({ item, st });
    }
  });

  console.log(`共偵測到 ${gamerItems.length} 筆包含巴哈授權的作品，準備檢閱...`);
  let newlyVerified = 0;
  let correctedToAcg = 0;
  let updatedToAni = 0;
  let consecutiveBlocks = 0;

  for (let i = 0; i < gamerItems.length; i++) {
    const { item, st } = gamerItems[i];
    const oldUrl = st.url;
    const cachedStatus = statusCache[item.id];

    // 如果已經在前面的執行中成功驗證過，直接沿用
    if (cachedStatus && (cachedStatus.status === 'VERIFIED_ANI' || cachedStatus.status === 'VERIFIED_ACG')) {
      st.url = cachedStatus.url;
      gamerCache[item.id] = cachedStatus.url;
      continue;
    }

    // 取得該動畫最精準的 ACG 百科頁面 URL
    const acgDetailUrl = bgmMap.get(item.id) || (item.titleJa ? titleJaMap.get(item.titleJa.trim()) : null) || (st.url.includes('acgDetail.php') ? st.url : null);
    if (!acgDetailUrl) {
      // 若無 ACG 百科頁面紀錄，保持原樣
      statusCache[item.id] = { status: 'NO_ACG_PAGE', url: st.url, updatedAt: new Date().toISOString() };
      continue;
    }

    // 請求 ACG 百科頁面 (使用 Desktop User-Agent)
    try {
      const res = await fetch(acgDetailUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });
      const html = await res.text();

      // 防呆：偵測阻擋或維護
      if (html.includes('系統維修') || html.includes('Cloudflare') || html.includes('請稍後') || res.status === 403 || res.status === 503) {
        consecutiveBlocks++;
        console.warn(`⚠️ [遭遇防護/維護] [${i+1}/${gamerItems.length}] "${item.titleZh}" 暫時跳過，已做標記...`);
        statusCache[item.id] = { status: 'BLOCKED', url: st.url, updatedAt: new Date().toISOString() };
        if (consecutiveBlocks >= 5) {
          console.error('\n🚨 連續遭遇 5 次巴哈姆特防護攔截，自動終止本次執行以保護進度，請稍後再試！');
          break;
        }
        await sleep(3000);
        continue;
      }

      consecutiveBlocks = 0; // 重置阻擋計數
      const $ = cheerio.load(html);
      let foundAniUrl = null;

      $('a').each((_, el) => {
        let href = $(el).attr('href') || '';
        if (href.includes('ani.gamer.com.tw') && !foundAniUrl) {
          if (href.startsWith('//')) href = 'https:' + href;
          else if (href.startsWith('http://')) href = href.replace('http://', 'https://');
          foundAniUrl = href;
        }
      });

      if (foundAniUrl) {
        st.url = foundAniUrl;
        gamerCache[item.id] = foundAniUrl;
        statusCache[item.id] = { status: 'VERIFIED_ANI', url: foundAniUrl, updatedAt: new Date().toISOString() };
        if (oldUrl !== foundAniUrl) {
          updatedToAni++;
          console.log(`📺 [轉為播放頁] [${i+1}/${gamerItems.length}] "${item.titleZh}" ➜ ${foundAniUrl}`);
        } else {
          console.log(`🟢 [驗證正確] [${i+1}/${gamerItems.length}] "${item.titleZh}"`);
        }
      } else {
        st.url = acgDetailUrl;
        gamerCache[item.id] = acgDetailUrl;
        statusCache[item.id] = { status: 'VERIFIED_ACG', url: acgDetailUrl, updatedAt: new Date().toISOString() };
        if (oldUrl.includes('ani.gamer.com.tw')) {
          correctedToAcg++;
          console.log(`🔴 [修正錯誤綁定] [${i+1}/${gamerItems.length}] "${item.titleZh}" ➜ 此頁面無動畫瘋連結，已還原為 ACG 百科: ${acgDetailUrl}`);
        } else {
          console.log(`🔵 [維持 ACG 頁] [${i+1}/${gamerItems.length}] "${item.titleZh}"`);
        }
      }

      newlyVerified++;
      // 每 20 筆或完成時即時儲存
      if (newlyVerified % 20 === 0 || i === gamerItems.length - 1) {
        fs.writeFileSync(DATA_FILE, JSON.stringify(animeList, null, 2), 'utf-8');
        fs.writeFileSync(GAMER_CACHE_FILE, JSON.stringify(gamerCache, null, 2), 'utf-8');
        fs.writeFileSync(STATUS_FILE, JSON.stringify(statusCache, null, 2), 'utf-8');
      }

      await sleep(1000); // 溫和間隔 1 秒
    } catch (err) {
      console.warn(`❌ [請求錯誤] [${i+1}/${gamerItems.length}] "${item.titleZh}": ${err.message}`);
      statusCache[item.id] = { status: 'ERROR', url: st.url, updatedAt: new Date().toISOString() };
    }
  }

  // 最終儲存
  fs.writeFileSync(DATA_FILE, JSON.stringify(animeList, null, 2), 'utf-8');
  fs.writeFileSync(GAMER_CACHE_FILE, JSON.stringify(gamerCache, null, 2), 'utf-8');
  fs.writeFileSync(STATUS_FILE, JSON.stringify(statusCache, null, 2), 'utf-8');

  console.log('\n======================================================');
  console.log(`🎉 本次洗滌檢閱結束！`);
  console.log(`   - 成功檢閱並標記: ${newlyVerified} 筆`);
  console.log(`   - 修正錯誤綁定（還原為 ACG 百科）: ${correctedToAcg} 筆`);
  console.log(`   - 發現並更新動畫瘋播放頁: ${updatedToAni} 筆`);
  console.log('======================================================\n');
}

rewashAll();

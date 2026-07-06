import fs from 'fs';
import path from 'path';
import { matchBangumiItem, aiMatchedRecords, runTitleNormalizationMatch } from './scraper_utils.mjs';

const ANIME_DATA_PATH = path.join(process.cwd(), 'public', 'anime_data.json');
const OVERRIDE_PATH = path.join(process.cwd(), 'public', 'custom_override.json');
const REPORT_JSON = path.join(process.cwd(), 'scraper', 'title_match_streaming_report.json');
const REPORT_MD = path.join(process.cwd(), 'scraper', 'title_match_streaming_report.md');

const STREAMING_SITE_NAMES = {
  gamer: { name: '動畫瘋', region: '台港澳' },
  gamer_hk: { name: '動畫瘋', region: '台港澳' },
  netflix: { name: 'Netflix', region: '台灣' },
  disneyplus: { name: 'Disney+', region: '台灣' },
  prime_video: { name: 'Prime Video', region: '全球' },
  amazon_prime_video: { name: 'Prime Video', region: '全球' },
  crunchyroll: { name: 'Crunchyroll', region: '全球' },
  youtube: { name: 'YouTube', region: '亞洲' },
  viu: { name: 'Viu', region: '港澳' },
  mytv: { name: 'myTV SUPER', region: '港澳' },
  abema: { name: 'ABEMA', region: '日本' },
  nicovideo: { name: 'NicoNico', region: '日本' },
  danime: { name: 'd動畫商城', region: '日本' },
  unext: { name: 'U-NEXT', region: '日本' },
  bilibili_tw: { name: 'Bilibili', region: '台灣' },
  bilibili_hk_mo_tw: { name: 'Bilibili', region: '台港澳' },
  bilibili_hk_mo: { name: 'Bilibili', region: '港澳' },
  bilibili: { name: 'Bilibili', region: '中國' },
  iqiyi: { name: '愛奇藝', region: '台灣' },
  kktv: { name: 'KKTV', region: '台灣' },
  linetv: { name: 'LINE TV', region: '台灣' },
  friday: { name: 'friDay影音', region: '台灣' },
  myvideo: { name: 'MyVideo', region: '台灣' },
  hamivideo: { name: 'Hami Video', region: '台灣' },
  muse_tw: { name: '木棉花', region: '台灣' },
  muse_hk: { name: '木棉花', region: '港澳' },
  ani_one: { name: 'Ani-One', region: '亞洲' },
  ani_one_asia: { name: 'Ani-One', region: '亞洲' },
  tropics: { name: 'Tropics', region: '亞洲' }
};

function getStreamingUrl(siteObj, siteMeta) {
  if (siteObj.url) return siteObj.url;
  const meta = siteMeta?.[siteObj.site];
  if (meta && meta.urlTemplate) {
    return meta.urlTemplate.replace('{{id}}', siteObj.id);
  }
  return null;
}

async function runAudit() {
  console.log('🚀 開始載入 bangumi-data、動畫庫與手動補丁庫，進行中文譯名完美校正比對...');
  const animeData = JSON.parse(fs.readFileSync(ANIME_DATA_PATH, 'utf8'));
  const customOverrides = JSON.parse(fs.readFileSync(OVERRIDE_PATH, 'utf8'));
  
  let bgmMap = new Map(); // aniListId -> item
  let bgmTitleMap = new Map(); // titleJa -> item
  let bgmSiteMeta = {};

  try {
    const res = await fetch("https://raw.githubusercontent.com/bangumi-data/bangumi-data/master/dist/data.json");
    if (res.ok) {
      const data = await res.json();
      bgmSiteMeta = data.siteMeta || {};
      (data.items || []).forEach(item => {
        const aniListSite = item.sites?.find(s => s.site === 'aniList');
        if (aniListSite && aniListSite.id) {
          bgmMap.set(String(aniListSite.id), item);
        }
        if (item.title) {
          bgmTitleMap.set(item.title.trim(), item);
        }
      });
      console.log(`✅ bangumi-data 載入成功：ID 映射 ${bgmMap.size} 筆，日文標題映射 ${bgmTitleMap.size} 筆`);
    }
  } catch (e) {
    console.error("❌ 無法下載 bangumi-data:", e.message);
    return;
  }

  const results = {
    zeroToSomething: [], // 原本 0 授權平台 -> 透過標題比對找到平台
    partialToMore: []    // 原本已有部分平台 -> 透過標題比對找到額外新平台
  };

  let totalChecked = 0;
  let matchedById = 0;
  let matchedByTitleOnly = 0;
  const unmatchedList = [];

  for (const anime of animeData) {
    totalChecked++;
    const customOverride = customOverrides[anime.id] || customOverrides[anime.id.replace('anilist-', '')];
    const matchedItem = matchBangumiItem(anime.id, anime.titleJa, customOverride, bgmMap, bgmTitleMap);
    if (!matchedItem) {
      unmatchedList.push(anime);
      continue;
    }
    if (bgmMap.has(anime.id.replace('anilist-', ''))) {
      matchedById++;
      continue;
    }

    const matchedTitle = matchedItem;
    if (!matchedTitle || !matchedTitle.sites || matchedTitle.sites.length === 0) {
      continue;
    }

    matchedByTitleOnly++;

    const foundStreamings = [];
    matchedTitle.sites.forEach(s => {
      const siteConfig = STREAMING_SITE_NAMES[s.site];
      if (siteConfig && s.site !== 'aniList' && s.site !== 'bangumi' && s.site !== 'myAnimeList') {
        const url = getStreamingUrl(s, bgmSiteMeta);
        if (url) {
          foundStreamings.push({
            site: s.site,
            name: siteConfig.name,
            region: siteConfig.region,
            url: url
          });
        }
      }
    });

    if (foundStreamings.length === 0) continue;

    const currentStreamings = anime.streamings || [];
    const currentCount = currentStreamings.length;

    const currentSites = new Set(currentStreamings.map(s => `${s.site}_${s.url}`));
    const newStreamings = foundStreamings.filter(s => !currentSites.has(`${s.site}_${s.url}`));

    if (newStreamings.length === 0) continue;

    // 完美取得中文標題：優先 custom_override -> 再查 bangumi-data -> 保底原本
    let bestZh = anime.titleZh;
    if (customOverrides[anime.id] && customOverrides[anime.id].titleZh) {
      bestZh = customOverrides[anime.id].titleZh;
    }
    if ((!bestZh || bestZh === anime.titleJa) && matchedTitle && matchedTitle.titleTranslate) {
      if (matchedTitle.titleTranslate['zh-Hant']) {
        bestZh = matchedTitle.titleTranslate['zh-Hant'][0];
      } else if (matchedTitle.titleTranslate['zh-Hans']) {
        bestZh = matchedTitle.titleTranslate['zh-Hans'][0];
      }
    }

    const reportItem = {
      id: anime.id,
      titleZh: bestZh,
      titleJa: anime.titleJa,
      yearSeason: anime.yearSeason || '未知年份',
      currentStreamingsCount: currentCount,
      currentStreamings: currentStreamings.map(s => `${s.name}(${s.region})`),
      newFoundStreamingsCount: newStreamings.length,
      newFoundStreamings: newStreamings
    };

    if (currentCount === 0) {
      results.zeroToSomething.push(reportItem);
    } else {
      results.partialToMore.push(reportItem);
    }
  }

  if (unmatchedList.length > 0) {
    await runTitleNormalizationMatch(unmatchedList, bgmTitleMap);
  }

  // 排序：年份由新到舊
  const sortFn = (a, b) => {
    const parseYear = (str) => parseInt(str) || 0;
    return parseYear(b.yearSeason) - parseYear(a.yearSeason);
  };
  results.zeroToSomething.sort(sortFn);
  results.partialToMore.sort(sortFn);

  fs.writeFileSync(REPORT_JSON, JSON.stringify(results, null, 2), 'utf8');

  let md = `# 🔍 日文標題 100% 比對 — 授權平台重新找回清單 (前端譯名版)\n\n`;
  md += `> **生成時間**：${new Date().toLocaleString('zh-TW')}\n`;
  md += `> **檢查範圍**：全庫 ${totalChecked} 部動畫\n`;
  md += `> **譯名說明**：已整合 \`custom_override.json\` 與字典檔繁中譯名，呈現與前端網頁完全一致之繁體中文標題。\n`;
  md += `> **🛑 唯讀防護承諾**：本報告僅供人工審閱，**絕對未修改** \`anime_data.json\` 任何一滴資料！\n\n`;

  md += `## 🔴 第一部分：原本【完全無資料 (0 平台)】➜ 透過標題找回授權平台 (${results.zeroToSomething.length} 部)\n\n`;
  if (results.zeroToSomething.length === 0) {
    md += `*毫無遺漏！*\n\n`;
  } else {
    md += `| 動畫 ID | 中文名稱 (前端顯示) | 日文原名 | 年份季節 | 重新找回的授權播放平台 (點擊預覽) |\n`;
    md += `|---|---|---|---|---|\n`;
    results.zeroToSomething.forEach(item => {
      const links = item.newFoundStreamings.map(s => `[${s.name} (${s.region})](${s.url})`).join('<br>');
      md += `| \`${item.id}\` | **${item.titleZh}** | ${item.titleJa} | ${item.yearSeason} | ${links} |\n`;
    });
    md += `\n`;
  }

  md += `## 🟢 第二部分：原本【已有部分平台】➜ 透過標題發現額外新平台 (${results.partialToMore.length} 部)\n\n`;
  if (results.partialToMore.length === 0) {
    md += `*無額外發現！*\n\n`;
  } else {
    md += `| 動畫 ID | 中文名稱 (前端顯示) | 日文原名 | 年份季節 | 原有平台 | 額外找回的新增平台 (點擊預覽) |\n`;
    md += `|---|---|---|---|---|---|\n`;
    results.partialToMore.forEach(item => {
      const oldStr = item.currentStreamings.join(', ') || '無';
      const links = item.newFoundStreamings.map(s => `[${s.name} (${s.region})](${s.url})`).join('<br>');
      md += `| \`${item.id}\` | **${item.titleZh}** | ${item.titleJa} | ${item.yearSeason} | ${oldStr} | ${links} |\n`;
    });
    md += `\n`;
  }

  md += `## 🤖 第三部分：AI 正規化標題對照自動配對成功清單 (${aiMatchedRecords.length} 部)\n\n`;
  if (aiMatchedRecords.length === 0) {
    md += `*本次未觸發 AI 正規化對照或無新增配對！*\n\n`;
  } else {
    md += `| 動畫 ID | 日文原名 | 字典對齊標題 | 字典 BGM ID |\n`;
    md += `|---|---|---|---|\n`;
    aiMatchedRecords.forEach(item => {
      md += `| \`${item.id}\` | ${item.titleJa} | **${item.matchedBgmTitle}** | \`${item.bgmId}\` |\n`;
    });
    md += `\n`;
  }

  fs.writeFileSync(REPORT_MD, md, 'utf8');
  console.log(`📝 報告已重新儲存，所有譯名已校正為中文！`);
  if (aiMatchedRecords.length > 0) {
    console.log(`🤖 共有 ${aiMatchedRecords.length} 部動畫透過 AI 正規化標題對照成功找到 bangumi-data 字典！`);
  }
}

runAudit();

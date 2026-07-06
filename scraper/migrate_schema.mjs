import fs from 'fs';
import path from 'path';

const PUBLIC_DIR = path.resolve('public');
const DATA_FILE = path.join(PUBLIC_DIR, 'anime_data.json');
const OLD_DATA_FILE = path.join(PUBLIC_DIR, 'anime_data_old.json');
const OVERRIDE_FILE = path.join(PUBLIC_DIR, 'custom_override.json');

const seasonPriority = { '秋': 4, '夏': 3, '春': 2, '冬': 1 };

function sortAnimeList(list) {
  return list.sort((a, b) => {
    // 解析年份與季節 e.g. "2026 秋"
    const [yearAStr, seasonA] = (a.yearSeason || '').split(' ');
    const [yearBStr, seasonB] = (b.yearSeason || '').split(' ');
    const yearA = parseInt(yearAStr, 10) || 0;
    const yearB = parseInt(yearBStr, 10) || 0;

    if (yearA !== yearB) {
      return yearB - yearA; // 年份由新到舊 (遞減)
    }
    const prioA = seasonPriority[seasonA] || 0;
    const prioB = seasonPriority[seasonB] || 0;
    return prioB - prioA; // 季節遞減：秋 > 夏 > 春 > 冬
  });
}

function migrate() {
  console.log('🚀 開始執行資料庫 Schema 規範化轉移...\n');

  // 1. 讀取 custom_override.json
  let overrideData = {};
  if (fs.existsSync(OVERRIDE_FILE)) {
    overrideData = JSON.parse(fs.readFileSync(OVERRIDE_FILE, 'utf-8'));
  }

  let overrideIDChanged = 0;
  let overrideSourceCleaned = 0;
  let showFalseMoved = 0;

  // 1.1 規範化 custom_override.json ID 與 source
  const newOverrideData = {};
  for (const [key, val] of Object.entries(overrideData)) {
    let stdKey = key;
    if (/^\d+$/.test(key)) {
      stdKey = `anilist-${key}`;
      overrideIDChanged++;
    }

    const entry = newOverrideData[stdKey] ? { ...newOverrideData[stdKey], ...val } : { ...val };

    // 規範化 source: 只有 "manual", "gamer", "ai"
    if (entry.source) {
      if (!['manual', 'gamer', 'ai'].includes(entry.source)) {
        if (entry.source === 'bangumi-data' || entry.source.includes('bangumi')) {
          // bangumi-data 來源的翻譯不應該放在 custom_override
          delete entry.source;
          overrideSourceCleaned++;
        } else {
          entry.source = 'manual'; // 未知來源預設歸為 manual
          overrideSourceCleaned++;
        }
      }
    }

    // 規範化 show 屬性: 如果是 True 或 "true"，不用特別寫出屬性
    if (entry.show === true || entry.show === 'true') {
      delete entry.show;
    } else if (entry.show === false || entry.show === 'false') {
      entry.show = false;
    }

    // 如果清理後空了就不保留
    if (Object.keys(entry).length > 0) {
      newOverrideData[stdKey] = entry;
    }
  }
  overrideData = newOverrideData;

  // 2. 規範化 anime_data.json 與 anime_data_old.json
  function processAnimeFile(filePath) {
    if (!fs.existsSync(filePath)) return null;
    const raw = fs.readFileSync(filePath, 'utf-8');
    const list = JSON.parse(raw);

    let idCleaned = 0;
    let coverCleaned = 0;
    let showCleaned = 0;

    const migratedList = list.map(item => {
      const newItem = { ...item };

      // A. 規範 ID
      if (/^\d+$/.test(newItem.id)) {
        newItem.id = `anilist-${newItem.id}`;
        idCleaned++;
      }

      // B. 處理 show 屬性：移至 custom_override.json
      if (newItem.show !== undefined) {
        if (newItem.show === false || newItem.show === 'false') {
          if (!overrideData[newItem.id]) overrideData[newItem.id] = {};
          overrideData[newItem.id].show = false;
          showFalseMoved++;
        }
        delete newItem.show;
        showCleaned++;
      }

      // C. 處理封面：改為 coverImageAniList 與 coverImageGamer，移除 coverImage 與 preferredCoverImage
      let aniListCover = newItem.coverImageAniList || '';
      let gamerCover = newItem.coverImageGamer || '';

      if (newItem.coverImage) {
        if (newItem.coverImage.includes('anilist.co') && !aniListCover) {
          aniListCover = newItem.coverImage;
        } else if ((newItem.coverImage.includes('bahamut.com.tw') || newItem.coverImage.includes('gamer.com.tw')) && !gamerCover) {
          gamerCover = newItem.coverImage;
        }
      }

      // 檢查 preferredCoverImage
      if (newItem.preferredCoverImage) {
        if (newItem.preferredCoverImage.includes('anilist.co') && !aniListCover) {
          aniListCover = newItem.preferredCoverImage;
        } else if ((newItem.preferredCoverImage.includes('bahamut.com.tw') || newItem.preferredCoverImage.includes('gamer.com.tw')) && !gamerCover) {
          gamerCover = newItem.preferredCoverImage;
        } else {
          // 如果是自訂封面或第三方封面，放入 custom_override 的 coverImage 作為優先顯示封面
          if (!overrideData[newItem.id]) overrideData[newItem.id] = {};
          if (!overrideData[newItem.id].coverImage) {
            overrideData[newItem.id].coverImage = newItem.preferredCoverImage;
          }
        }
        delete newItem.preferredCoverImage;
      }

      // 刪除舊有 coverImage
      delete newItem.coverImage;

      // 設定雙欄位
      newItem.coverImageGamer = gamerCover;
      newItem.coverImageAniList = aniListCover;
      coverCleaned++;

      return newItem;
    });

    const sortedList = sortAnimeList(migratedList);
    return { sortedList, stats: { idCleaned, coverCleaned, showCleaned } };
  }

  const mainRes = processAnimeFile(DATA_FILE);
  if (mainRes) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(mainRes.sortedList, null, 2), 'utf-8');
    console.log(`✅ [anime_data.json] 轉移完成：`);
    console.log(`   - 規範 ID: ${mainRes.stats.idCleaned} 筆`);
    console.log(`   - 轉移雙封面欄位: ${mainRes.stats.coverCleaned} 筆`);
    console.log(`   - 移除並遷移 show 屬性: ${mainRes.stats.showCleaned} 筆`);
  }

  const oldRes = processAnimeFile(OLD_DATA_FILE);
  if (oldRes) {
    fs.writeFileSync(OLD_DATA_FILE, JSON.stringify(oldRes.sortedList, null, 2), 'utf-8');
    console.log(`✅ [anime_data_old.json] 轉移同步完成。`);
  }

  fs.writeFileSync(OVERRIDE_FILE, JSON.stringify(overrideData, null, 2), 'utf-8');
  console.log(`✅ [custom_override.json] 轉移完成：`);
  console.log(`   - 規範純數字 ID: ${overrideIDChanged} 筆`);
  console.log(`   - 清理非標準 Source: ${overrideSourceCleaned} 筆`);
  console.log(`   - 自 anime_data 移入 show:false: ${showFalseMoved} 筆`);

  console.log(`\n✨ 資料庫 Schema 規範化轉移全數順利完成！`);
}

migrate();

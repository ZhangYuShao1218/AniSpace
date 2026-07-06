/**
 * 批量修改動畫譯名腳本
 * 用法: node .agents/skills/manage-anime-data/scripts/update_titles.mjs '<JSON陣列>'
 * 
 * JSON 格式: [{ "id": "anilist-XXXXX", "newTitle": "新譯名" }, ...]
 * 
 * 範例:
 *   node .agents/skills/manage-anime-data/scripts/update_titles.mjs '[{"id":"anilist-19163","newTitle":"約會大作戰 DATE A LIVE II"}]'
 */
import fs from 'fs';
import path from 'path';

const DATA_FILE = path.join(process.cwd(), 'public', 'anime_data.json');
const OVERRIDE_FILE = path.join(process.cwd(), 'public', 'custom_override.json');

// 解析參數：支援直接 JSON 字串或 JSON 檔案路徑
const rawArg = process.argv[2];
if (!rawArg) {
  console.error('❌ 請提供 JSON 格式的修改清單或 JSON 檔案路徑。');
  console.error('   用法 A (檔案): node update_titles.mjs fixes.json');
  console.error('   用法 B (字串): node update_titles.mjs \'[{"id":"anilist-XXXXX","newTitle":"新名稱"}]\'');
  process.exit(1);
}

let titleFixes;
try {
  if (rawArg.endsWith('.json') && fs.existsSync(rawArg)) {
    titleFixes = JSON.parse(fs.readFileSync(rawArg, 'utf8'));
  } else {
    titleFixes = JSON.parse(rawArg);
  }
} catch (e) {
  console.error('❌ JSON 解析失敗:', e.message);
  process.exit(1);
}

if (!Array.isArray(titleFixes) || titleFixes.length === 0) {
  console.error('❌ 修改清單必須為非空 JSON 陣列。');
  process.exit(1);
}

// 驗證所有 ID 格式
for (const fix of titleFixes) {
  if (!fix.id || !fix.newTitle) {
    console.error(`❌ 每筆修改必須包含 "id" 與 "newTitle"。問題項目:`, fix);
    process.exit(1);
  }
  if (!/^anilist-\d+$/.test(fix.id)) {
    console.error(`❌ ID 格式錯誤: "${fix.id}"。必須為 "anilist-XXXXX" 格式。`);
    process.exit(1);
  }
}

// 讀取檔案
const animeData = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
const overrideData = JSON.parse(fs.readFileSync(OVERRIDE_FILE, 'utf8'));

console.log(`🚀 開始修改 ${titleFixes.length} 部動畫譯名 (manual 最高優先度)\n`);

let successCount = 0;
let notFoundCount = 0;

titleFixes.forEach(fix => {
  const item = animeData.find(a => a.id === fix.id);
  const oldTitle = item ? item.titleZh : null;

  // 更新 anime_data.json
  if (item) {
    item.titleZh = fix.newTitle;
    successCount++;
  } else {
    notFoundCount++;
    console.log(`  ⚠️ ${fix.id}: 在 anime_data.json 中找不到（僅更新 override）`);
  }

  // 更新 custom_override.json（鎖定為 manual 最高優先度）
  overrideData[fix.id] = overrideData[fix.id] || {};
  overrideData[fix.id].titleZh = fix.newTitle;
  overrideData[fix.id].source = 'manual';

  console.log(`  ✅ ${fix.id}: "${oldTitle || '(不存在)'}" ➜ "${fix.newTitle}"`);
});

// 排序：年份由新到舊，同年按季節（秋>夏>春>冬）
const seasonOrder = { '秋': 4, '夏': 3, '春': 2, '冬': 1 };
const parseSeasonScore = (ys) => {
  if (!ys) return 0;
  const p = ys.split(' ');
  return p.length === 2 ? parseInt(p[0], 10) * 10 + (seasonOrder[p[1]] || 0) : 0;
};
animeData.sort((a, b) => parseSeasonScore(b.yearSeason) - parseSeasonScore(a.yearSeason));

// 寫入
fs.writeFileSync(DATA_FILE, JSON.stringify(animeData, null, 2), 'utf8');
fs.writeFileSync(OVERRIDE_FILE, JSON.stringify(overrideData, null, 2), 'utf8');

// 驗證
console.log('\n--- 驗證結果 ---\n');
const verifyData = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
const verifyOverride = JSON.parse(fs.readFileSync(OVERRIDE_FILE, 'utf8'));
let verifyPass = true;

titleFixes.forEach(fix => {
  const item = verifyData.find(a => a.id === fix.id);
  const ov = verifyOverride[fix.id];
  const dataOk = item ? item.titleZh === fix.newTitle : true; // 若原本就不存在則不檢查
  const ovOk = ov && ov.titleZh === fix.newTitle && ov.source === 'manual';
  const status = dataOk && ovOk ? '✅' : '❌';
  if (!dataOk || !ovOk) verifyPass = false;
  console.log(`  ${status} ${fix.id}: data=${dataOk ? 'OK' : 'FAIL'} | override=${ovOk ? 'OK 🔒manual' : 'FAIL'}`);
});

console.log(`\n📊 修改 ${successCount} 筆成功` + (notFoundCount > 0 ? `，${notFoundCount} 筆僅更新 override` : '') + `。`);
console.log(verifyPass ? '🌟 驗證全數通過！' : '⚠️ 部分驗證失敗，請檢查。');

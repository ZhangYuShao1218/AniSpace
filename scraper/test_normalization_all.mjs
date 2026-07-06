import fs from 'fs';
import path from 'path';
import { runAiBangumiTitleMatch } from './scraper_utils.mjs';

const ANIME_DATA_PATH = path.join(process.cwd(), 'public', 'anime_data.json');
const BANGUMI_DATA_PATH = path.join(process.cwd(), 'public', 'bangumi_data.json');

async function main() {
  console.log('==================================================');
  console.log('⚡ 開始測試純本地程式化標題正規化引擎 (測試全部動畫)');
  console.log('==================================================\n');

  if (!fs.existsSync(BANGUMI_DATA_PATH) || !fs.existsSync(ANIME_DATA_PATH)) {
    console.error('❌ 找不到 bangumi_data.json 或 anime_data.json');
    process.exit(1);
  }

  // 1. 載入 Bangumi 字典
  console.log('📚 正在載入 Bangumi 字典庫...');
  const bangumiDataRaw = JSON.parse(fs.readFileSync(BANGUMI_DATA_PATH, 'utf-8'));
  const bangumiItems = bangumiDataRaw.items || bangumiDataRaw || [];
  const bgmTitleMap = new Map();
  bangumiItems.forEach(item => {
    if (item.title) bgmTitleMap.set(item.title.trim(), item);
    if (item.titleTranslate && item.titleTranslate['zh-Hans']) {
      item.titleTranslate['zh-Hans'].forEach(t => bgmTitleMap.set(t.trim(), item));
    }
    if (item.titleTranslate && item.titleTranslate['zh-Hant']) {
      item.titleTranslate['zh-Hant'].forEach(t => bgmTitleMap.set(t.trim(), item));
    }
  });
  console.log(`✅ 成功載入 Bangumi 字典，共 ${bgmTitleMap.size} 筆候選標題。`);

  // 2. 載入全量 Anime 資料庫
  console.log('🎬 正在載入本地動畫資料庫 (anime_data.json)...');
  const animeList = JSON.parse(fs.readFileSync(ANIME_DATA_PATH, 'utf-8'));
  console.log(`✅ 成功載入 ${animeList.length} 部動畫！`);

  // 3. 篩選目前未關聯 Bangumi 且有日文標題的所有動畫
  const unlinkedList = animeList
    .filter(a => !a.bangumiDataTitle && a.titleJa && a.titleJa.trim() !== '')
    .map(a => ({ id: a.id, titleJa: a.titleJa }));

  console.log(`\n🎯 找出 ${unlinkedList.length} 部目前「未關聯」Bangumi 資料的動畫，開始進行極速正規化對照...`);
  
  const startTime = Date.now();
  const matchedResults = await runAiBangumiTitleMatch(unlinkedList, bgmTitleMap);
  const costTime = ((Date.now() - startTime) / 1000).toFixed(4);

  console.log('--------------------------------------------------');
  console.log(`🚀 [全量測試完畢] 總共對照了 ${unlinkedList.length} 部動畫！`);
  console.log(`⚡ 成功精確命中: ${matchedResults.length} 部動畫！`);
  console.log(`⏱️ 總執行時間: ${costTime} 秒 (平均每部 ${(costTime / unlinkedList.length * 1000).toFixed(3)} 毫秒)！`);
  console.log('--------------------------------------------------');
  
  if (matchedResults.length > 0) {
    console.log('\n🌟 命中項目範例 (前 30 筆)：');
    matchedResults.slice(0, 30).forEach((res, idx) => {
      console.log(`   ${idx + 1}. [${res.id}] "${res.titleJa}" ➜ "${res.matchedBgmTitle}" (BGM ID: ${res.bgmId})`);
    });
  }
  console.log('\n==================================================');
  console.log('🎉 純程式化標題正規化引擎測試成功！完全無須 AI！');
  console.log('==================================================');
}

main().catch(err => {
  console.error('❌ 執行異常:', err);
  process.exit(1);
});

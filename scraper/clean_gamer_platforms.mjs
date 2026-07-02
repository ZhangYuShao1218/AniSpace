import fs from 'fs';
import path from 'path';
import { normalizeAndMergeStreamings } from './scraper_utils.mjs';

const DATA_FILE = path.join(process.cwd(), 'public', 'anime_data.json');

if (!fs.existsSync(DATA_FILE)) {
  console.error("❌ 找不到 public/anime_data.json");
  process.exit(1);
}

const animeList = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
let mergedCount = 0;

animeList.forEach(item => {
  if (item.streamings && item.streamings.length > 0) {
    const oldLen = item.streamings.length;
    const oldGamers = item.streamings.filter(s => s.site === 'gamer' || s.site === 'gamer_hk' || (s.name && s.name.includes('動畫瘋')));
    
    item.streamings = normalizeAndMergeStreamings(item.streamings);
    
    const newGamers = item.streamings.filter(s => s.site === 'gamer' || s.site === 'gamer_hk' || (s.name && s.name.includes('動畫瘋')));
    if (oldLen !== item.streamings.length || oldGamers.length > newGamers.length) {
      mergedCount++;
    }
  }
});

fs.writeFileSync(DATA_FILE, JSON.stringify(animeList, null, 2), 'utf-8');
console.log(`✅ 成功淨化並整合 anime_data.json！共處理了 ${mergedCount} 部動畫的「動畫瘋 / 動畫瘋 HK」整合。`);

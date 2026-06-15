import fs from 'fs';
import path from 'path';

const filesToUpdate = [
  'anime_data.json',
  'custom_override.json',
  'affiliates.json',
  'product_images.json'
];

const baseUrl = 'https://raw.githubusercontent.com/ZhangYuShao1218/AniSpace/main/public/';
const publicDir = path.join(process.cwd(), 'public');

async function downloadCloudData() {
  console.log("☁️  正在從 GitHub 雲端抓取最新的資料庫同步至本地...\n");
  
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  for (const file of filesToUpdate) {
    try {
      const res = await fetch(baseUrl + file);
      if (res.ok) {
        const text = await res.text();
        fs.writeFileSync(path.join(publicDir, file), text, 'utf-8');
        console.log(`✅ 成功更新: ${file}`);
      } else {
        console.warn(`⚠️ 無法下載 ${file} (可能雲端尚無此檔案): HTTP ${res.status}`);
      }
    } catch (error) {
      console.error(`❌ 下載 ${file} 時發生錯誤:`, error.message);
    }
  }
  console.log("\n✨ 雲端資料同步完畢！");
}

downloadCloudData();

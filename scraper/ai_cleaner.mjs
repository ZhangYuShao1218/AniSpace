import fs from 'fs';
import path from 'path';

// 此腳本為 AI 清洗的雛形
// 用法: node scraper/ai_cleaner.mjs
// 目標: 讀取 public/anime_data.json，找出名稱不一致的系列作，透過 LLM API (如 Gemini) 進行翻譯對齊。

const DATA_FILE = path.join(process.cwd(), 'public', 'anime_data.json');

async function main() {
  if (!fs.existsSync(DATA_FILE)) {
    console.error('找不到 anime_data.json，請先執行 node scraper/index.js');
    return;
  }

  const rawData = fs.readFileSync(DATA_FILE, 'utf-8');
  let animeList = JSON.parse(rawData);

  console.log(`載入共 ${animeList.length} 筆動畫資料。`);
  
  // TODO: 1. 分析標題，萃取出可疑的系列作 (例如帶有第2季, Part 2, 或開頭相同的動畫)
  // TODO: 2. 準備提示詞 (Prompt)，將這些可疑清單包裝為 JSON 送給 LLM API
  /*
    const prompt = `
      以下是一個 JSON 陣列，請幫我將屬於同一個系列作的動畫，統一其繁體中文前綴。
      例如 "轉生就是劍" 與 "轉生成為魔劍" 應該統一為 "轉生成為魔劍"。
      請直接回傳修正後的 JSON 陣列。
    `;
  */
  // TODO: 3. 呼叫 Gemini/OpenAI API
  // TODO: 4. 將 AI 回傳的正確標題覆蓋回 animeList
  // TODO: 5. 寫回 public/anime_data.json

  console.log('AI 清洗腳本雛型準備就緒！尚未呼叫真實 API。');
}

main();

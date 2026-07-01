import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const LOG_FILE = path.join(__dirname, 'daily_run.log');

const timestamp = new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' });
fs.writeFileSync(LOG_FILE, `=====================================\nAniSpace 每日任務完整執行 Log\n執行時間: ${timestamp}\n=====================================\n\n`, 'utf-8');

function logOutput(text) {
  process.stdout.write(text);
  fs.appendFileSync(LOG_FILE, text, 'utf-8');
}

function runStep(title, commandLine) {
  const stepHeader = `\n▶ [${new Date().toLocaleTimeString('zh-TW', { timeZone: 'Asia/Taipei' })}] 執行步驟: ${title}\n-------------------------------------\n`;
  logOutput(stepHeader);
  
  const [cmd, ...args] = commandLine.split(' ');
  const result = spawnSync(cmd, args, { cwd: process.cwd(), encoding: 'utf-8', shell: true });
  
  if (result.stdout) logOutput(result.stdout);
  if (result.stderr) logOutput(result.stderr);
  
  if (result.status !== 0) {
    logOutput(`\n❌ 步驟 [${title}] 執行發生異常，Exit code: ${result.status}\n`);
  } else {
    logOutput(`\n✅ 步驟 [${title}] 執行成功完成。\n`);
  }
}

logOutput('🚀 開始執行 AniSpace 完整每日自動化排程...\n');

runStep('1. 爬取最新動畫與洗滌 (anime_crawler)', 'node scraper/anime_crawler.js');
runStep('2. 後處理比對與 Override 清理 (post_process)', 'node scraper/post_process.js');
runStep('3. 蝦皮周邊比價監控與 AI 分析 (shopee_checker)', 'node scraper/shopee_checker.mjs');
runStep('4. 每日總結 Email 寄送 (email_report)', 'node scraper/email_report.mjs');

logOutput(`\n✨ 所有每日任務執行完畢！完整日誌已儲存至 ${LOG_FILE}\n`);

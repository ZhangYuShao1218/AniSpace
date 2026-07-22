import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import nodemailer from 'nodemailer';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const summaryPath = path.join(__dirname, 'run_summary.txt');
const SYNOPSIS_NEW_FILE = path.join(process.cwd(), 'scraper', 'synopsis_newly_fetched.json');

async function sendReport() {
  const { EMAIL_USER, EMAIL_PASS } = process.env;
  if (!EMAIL_USER || !EMAIL_PASS) {
    console.log("未設定 EMAIL_USER 或 EMAIL_PASS，跳過寄送總結報告 Email。");
    return;
  }

  let appVersion = '1.0.14';
  try {
    const pkgData = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf-8'));
    if (pkgData && pkgData.version) appVersion = pkgData.version;
  } catch (e) { }

  let dataVersionStr = '00100';
  try {
    const vData = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'public', 'data_version.json'), 'utf-8'));
    if (typeof vData.version === 'number') {
      dataVersionStr = String(vData.version).padStart(5, '0');
    }
  } catch (e) { }

  let reportContent = "本日排程執行完畢，動畫資料與周邊商品皆維持最新狀態。\n詳細執行過程與檢閱紀錄請參考隨信附帶的完整執行日誌 (daily_run.log)。";
  if (fs.existsSync(summaryPath)) {
    reportContent = fs.readFileSync(summaryPath, 'utf-8');
  }

  // Read anime_data.json for total count
  const animeDataFile = path.join(process.cwd(), 'public', 'anime_data.json');
  let totalAnime = 0;
  if (fs.existsSync(animeDataFile)) {
    try {
      const arr = JSON.parse(fs.readFileSync(animeDataFile, 'utf-8'));
      totalAnime = arr.length;
    } catch(e) {}
  }
  
  // Read synopsis_tracking.json for translated count
  const TRACKING_FILE = path.join(process.cwd(), 'scraper', 'synopsis_tracking.json');
  let translatedCount = 0;
  if (fs.existsSync(TRACKING_FILE)) {
    try {
      const tracker = JSON.parse(fs.readFileSync(TRACKING_FILE, 'utf-8'));
      translatedCount = Object.values(tracker).filter(t => t.zh).length;
    } catch(e) {}
  }
  const lackSynopsisCount = Math.max(0, totalAnime - translatedCount);

  if (fs.existsSync(SYNOPSIS_NEW_FILE)) {
    try {
      const newlyFetched = JSON.parse(fs.readFileSync(SYNOPSIS_NEW_FILE, 'utf-8'));
      reportContent += `\n\n【劇情簡介狀態】\n總計收錄: ${totalAnime} 部動畫\n缺乏簡介: ${lackSynopsisCount} 部\n本日新增: ${newlyFetched.length} 筆簡介\n`;
      if (newlyFetched.length > 0) {
        reportContent += `新增清單：\n`;
        newlyFetched.forEach(item => {
          reportContent += `- [${item.id}] ${item.title}\n`;
        });
      }
      fs.unlinkSync(SYNOPSIS_NEW_FILE);
    } catch (e) {
      console.error("讀取 synopsis_newly_fetched.json 失敗", e);
    }
  } else {
    reportContent += `\n\n【劇情簡介狀態】\n總計收錄: ${totalAnime} 部動畫\n缺乏簡介: ${lackSynopsisCount} 部\n本日新增: 0 筆簡介\n`;
  }

  const versionHeader = `📌 當前系統版本資訊\n・應用程式版本號：v${appVersion}\n・動畫資料庫版號：(${dataVersionStr})\n-------------------------------------\n\n`;
  reportContent = versionHeader + reportContent;

  console.log('\n=====================================');
  console.log(`📧 每日執行總結報告摘要 [v${appVersion} - (${dataVersionStr})] (同步印表)：`);
  console.log(reportContent.trim());
  console.log('=====================================\n');
  
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: EMAIL_USER,
      pass: EMAIL_PASS
    }
  });

  const logFilePath = path.join(__dirname, 'daily_run.log');
  const unlinkedMdPath = path.join(process.cwd(), 'public', 'unlinked_anime_list.md');
  const attachments = [];
  if (fs.existsSync(logFilePath)) {
    attachments.push({
      filename: `daily_run_${new Date().toLocaleDateString('zh-TW', { timeZone: 'Asia/Taipei' }).replace(/\//g, '-')}.log`,
      path: logFilePath
    });
  }
  if (fs.existsSync(unlinkedMdPath)) {
    attachments.push({
      filename: `unlinked_anime_list.md`,
      path: unlinkedMdPath
    });
  }

  try {
    await transporter.sendMail({
      from: EMAIL_USER,
      to: EMAIL_USER,
      subject: `【AniSpace 每日報告】v${appVersion} - (${dataVersionStr}) (${new Date().toLocaleDateString('zh-TW', { timeZone: 'Asia/Taipei' })})`,
      text: reportContent,
      attachments
    });
    const attNames = attachments.map(a => a.filename).join(', ');
    console.log(`✅ 成功寄送每日執行總結報告 Email！（已隨信附帶附件：${attNames || '無'}）`);
    
    // 清除舊報告
    if (fs.existsSync(summaryPath)) {
      fs.unlinkSync(summaryPath);
    }
  } catch (error) {
    console.error("❌ 寄送 Email 失敗:", error);
  }
}

sendReport();

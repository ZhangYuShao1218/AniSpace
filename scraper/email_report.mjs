import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import nodemailer from 'nodemailer';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const summaryPath = path.join(__dirname, 'run_summary.txt');

async function sendReport() {
  const { EMAIL_USER, EMAIL_PASS } = process.env;
  if (!EMAIL_USER || !EMAIL_PASS) {
    console.log("未設定 EMAIL_USER 或 EMAIL_PASS，跳過寄送總結報告 Email。");
    return;
  }

  let reportContent = "本日排程執行完畢，動畫資料與周邊商品皆維持最新狀態。\n詳細執行過程與檢閱紀錄請參考隨信附帶的完整執行日誌 (daily_run.log)。";
  if (fs.existsSync(summaryPath)) {
    reportContent = fs.readFileSync(summaryPath, 'utf-8');
  }
  
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: EMAIL_USER,
      pass: EMAIL_PASS
    }
  });

  const logFilePath = path.join(__dirname, 'daily_run.log');
  const attachments = [];
  if (fs.existsSync(logFilePath)) {
    attachments.push({
      filename: `daily_run_${new Date().toLocaleDateString('zh-TW', { timeZone: 'Asia/Taipei' }).replace(/\//g, '-')}.log`,
      path: logFilePath
    });
  }

  try {
    await transporter.sendMail({
      from: EMAIL_USER,
      to: EMAIL_USER,
      subject: `【AniSpace 每日執行報告】${new Date().toLocaleDateString('zh-TW', { timeZone: 'Asia/Taipei' })}`,
      text: reportContent,
      attachments
    });
    console.log(`✅ 成功寄送每日執行總結報告 Email！（已隨信附帶完整日誌 ${attachments.length > 0 ? attachments[0].filename : ''}）`);
    
    // 清除舊報告
    if (fs.existsSync(summaryPath)) {
      fs.unlinkSync(summaryPath);
    }
  } catch (error) {
    console.error("❌ 寄送 Email 失敗:", error);
  }
}

sendReport();

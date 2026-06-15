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

  if (!fs.existsSync(summaryPath)) {
    console.log("找不到 run_summary.txt，沒有報告可以寄送。");
    return;
  }

  const reportContent = fs.readFileSync(summaryPath, 'utf-8');
  
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: EMAIL_USER,
      pass: EMAIL_PASS
    }
  });

  try {
    await transporter.sendMail({
      from: EMAIL_USER,
      to: EMAIL_USER,
      subject: `【AniSpace 每日執行報告】${new Date().toLocaleDateString('zh-TW')}`,
      text: reportContent
    });
    console.log("✅ 成功寄送每日執行總結報告 Email！");
    
    // 清除舊報告
    fs.unlinkSync(summaryPath);
  } catch (error) {
    console.error("❌ 寄送 Email 失敗:", error);
  }
}

sendReport();

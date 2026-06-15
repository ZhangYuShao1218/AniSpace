import fs from 'fs/promises';
import path from 'path';
import nodemailer from 'nodemailer';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer';
import { GoogleGenAI } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PUBLIC_DIR = path.resolve(__dirname, '../public');

const DEFAULT_STORES = [
  { id: 'muse', title: "MUSE 木棉花官方旗艦店", description: "支持正版！各式熱門當季動畫周邊、服飾、福袋都在這。", affiliateUrl: "https://s.shopee.tw/1BJuh4hhQC", imageUrl: "/affiliates/fallback_muse.jpg" },
  { id: 'mandy', title: "曼迪傳播動漫館", description: "名偵探柯南、孤獨搖滾等經典與熱門強檔動畫官方周邊。", affiliateUrl: "https://s.shopee.tw/110UUliKlB", imageUrl: "/affiliates/fallback_mandy.jpg" },
  { id: 'eslite', title: "eslite 誠品", description: "質感選物與書籍！探索最新的漫畫、輕小說與文創商品。", affiliateUrl: "https://s.shopee.tw/qh4ISiy6A", imageUrl: "/affiliates/fallback_eslite.jpg" },
  { id: 'toysrus', title: "玩具反斗城 Toysrus", description: "各式經典玩具、模型與桌遊，滿足各個年齡層的玩心。", affiliateUrl: "https://s.shopee.tw/gNe69jbR9", imageUrl: "/affiliates/fallback_toysrus.jpg" },
  { id: 'toyego', title: "TOYeGO 玩具e哥", description: "精選各式熱門模型、盲盒與動漫周邊，豐富你的收藏。", affiliateUrl: "https://s.shopee.tw/4VaMfCV0eu", imageUrl: "/affiliates/fallback_toyego.jpg" }
];

const extractImagesFn = () => {
  return Array.from(document.querySelectorAll('img'))
    .filter(img => {
      // 基本硬體過濾：排除極端長寬比與過小的圖片
      if (img.naturalWidth === 0 || img.naturalHeight === 0) return false;
      if (img.naturalWidth > img.naturalHeight * 1.5) return false;
      if (img.naturalWidth < 150 || img.naturalHeight < 150) return false;
      return true;
    })
    .map(img => ({ url: img.src || img.getAttribute('data-src'), alt: img.alt || '' }))
    .filter(item => {
      if (!item.url) return false;
      const lowerSrc = item.url.toLowerCase();
      if (lowerSrc.includes('logo') || lowerSrc.includes('icon') || lowerSrc.includes('deco') || lowerSrc.includes('banner_placeholder')) return false;
      if (lowerSrc.includes('product-restricted')) return false; // 排除誠品限制級遮罩
      if (lowerSrc.endsWith('.svg') || lowerSrc.endsWith('.gif')) return false;
      return true;
    })
    .map(item => {
      let finalUrl = item.url;
      if (finalUrl.includes(' ')) finalUrl = finalUrl.split(' ')[0];
      if (finalUrl.includes('%20')) finalUrl = finalUrl.split('%20')[0];
      if (finalUrl.includes('wixstatic.com/media/') && finalUrl.includes('~mv2')) {
        finalUrl = finalUrl.split('/v1/')[0];
      }
      return { url: finalUrl, alt: item.alt };
    });
};

async function scrapeImages(browser) {
  let rawImages = [];
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
  await page.setViewport({ width: 1920, height: 1080 });

  // 1. 誠品漫畫館
  try {
    await page.goto('https://www.eslite.com/category/2/137', { waitUntil: 'networkidle2', timeout: 30000 });
    await page.evaluate(() => window.scrollBy(0, 1000));
    await new Promise(r => setTimeout(r, 2000));
    rawImages.push(...(await page.evaluate(extractImagesFn)));
  } catch (e) {}

  // 2. 木棉花商城
  try {
    await page.goto('https://mall.e-muse.com.tw/v2/official/SalePageCategory/0?sortMode=Newest', { waitUntil: 'networkidle2', timeout: 30000 });
    await page.evaluate(() => window.scrollBy(0, 1000));
    await new Promise(r => setTimeout(r, 2000));
    rawImages.push(...(await page.evaluate(extractImagesFn)));
  } catch (e) {}

  await page.close();
  
  // 去重
  const uniqueUrls = new Set();
  const distinctRawImages = [];
  for (const img of rawImages) {
    if (!uniqueUrls.has(img.url)) {
      uniqueUrls.add(img.url);
      distinctRawImages.push(img);
    }
  }

  return distinctRawImages;
}

// 整合 Gemini AI 過濾機制
async function filterImagesWithAI(rawImages) {
  if (!process.env.GEMINI_API_KEY) {
    console.log("未檢測到 GEMINI_API_KEY，將退回傳統過濾模式。");
    return rawImages.map(img => img.url);
  }

  console.log(`準備將 ${rawImages.length} 筆原始資料交由 Gemini AI 進行分析與篩選...`);
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const promptText = await fs.readFile(path.join(__dirname, 'ai_prompt.md'), 'utf-8');
    
    // 將資料轉為精簡 JSON 提供給 AI 避免 Token 爆炸
    const payload = JSON.stringify(rawImages);
    
    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: `System Instruction:\n${promptText}\n\nData Payload:\n${payload}`
    });

    // 處理 Gemini 可能回傳的 Markdown JSON 區塊
    let rawText = response.text || '';
    if (rawText.startsWith('```json')) {
      rawText = rawText.replace(/```json\n?/, '').replace(/```\n?$/, '');
    } else if (rawText.startsWith('```')) {
      rawText = rawText.replace(/```\n?/, '').replace(/```\n?$/, '');
    }

    const aiResults = JSON.parse(rawText.trim());
    console.log(`✅ Gemini AI 分析完成！保留了 ${aiResults.length} 項高價值商品。`);
    return aiResults.map(item => item.url);
  } catch (error) {
    console.error("Gemini AI 過濾失敗，將退回傳統過濾模式:", error.message);
    return rawImages.map(img => img.url);
  }
}

async function checkUrl(url) {
  try {
    const response = await fetch(url, { method: 'GET', redirect: 'follow', headers: { 'User-Agent': 'Mozilla/5.0 (Windows)' } });
    return response.ok && !response.url.includes('not_found');
  } catch { return false; }
}

async function sendAlertEmail(failedStores) {
  const { EMAIL_USER, EMAIL_PASS } = process.env;
  if (!EMAIL_USER || !EMAIL_PASS) return;

  const transporter = nodemailer.createTransport({ service: 'gmail', auth: { user: EMAIL_USER, pass: EMAIL_PASS } });
  try {
    await transporter.sendMail({
      from: EMAIL_USER, to: EMAIL_USER,
      subject: `⚠️ 【AniSpace】蝦皮聯盟行銷連結失效通知`,
      text: `系統檢測到推廣連結失效：\n${failedStores.map(s => `- ${s.title}: ${s.affiliateUrl}`).join('\n')}`
    });
  } catch (error) {}
}

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

async function run() {
  console.log('====================================');
  console.log('啟動 Puppeteer 真實商品爬蟲系統...');

  let imagePool = [];
  try {
    const browser = await puppeteer.launch({ headless: "new", args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const rawData = await scrapeImages(browser);
    await browser.close();
    
    // 呼叫 Gemini 過濾
    imagePool = await filterImagesWithAI(rawData);
  } catch (err) {
    console.error("爬蟲執行失敗:", err.message);
  }

  if (imagePool.length > 0) shuffleArray(imagePool);

  const activeStores = [];
  const failedStores = [];

  for (let i = 0; i < DEFAULT_STORES.length; i++) {
    const store = DEFAULT_STORES[i];
    if (imagePool.length > 0) store.imageUrl = imagePool.pop();
    
    const isAlive = await checkUrl(store.affiliateUrl);
    if (isAlive) {
      activeStores.push(store);
      console.log(`✔️ 正常: ${store.title}`);
    } else {
      failedStores.push(store);
      console.log(`❌ 失效: ${store.title}`);
    }
    await new Promise(r => setTimeout(r, 1000));
  }

  const outputPath = path.join(PUBLIC_DIR, 'affiliates.json');
  await fs.writeFile(outputPath, JSON.stringify(activeStores, null, 2), 'utf-8');
  console.log(`\n✅ 檢查與更新完成！已寫入 ${outputPath}`);

  if (failedStores.length > 0) await sendAlertEmail(failedStores);
}

run().catch(console.error);

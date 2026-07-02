import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import * as OpenCC from 'opencc-js';
import { GoogleGenAI } from '@google/genai';

const DATA_FILE = path.join(process.cwd(), 'public', 'anime_data.json');
const OVERRIDE_FILE = path.join(process.cwd(), 'public', 'custom_override.json');
const PROMPT_FILE = path.join(process.cwd(), 'scraper', 'ai_translate_prompt.md');
const LOG_FILE = path.join(process.cwd(), 'translation_full_log.md');

const kanaRegex = /[\u3041-\u3096\u30A1-\u30FA]/;
const s2t = OpenCC.Converter({ from: 'cn', to: 'tw' });

async function translateMissing() {
  console.log("🚀 啟動本地翻譯流程 (Step A -> B -> C -> D -> E)...");

  if (!fs.existsSync(DATA_FILE)) {
    console.error("❌ 找不到 public/anime_data.json");
    process.exit(1);
  }

  const animeList = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
  let overrideData = {};
  if (fs.existsSync(OVERRIDE_FILE)) {
    try { overrideData = JSON.parse(fs.readFileSync(OVERRIDE_FILE, 'utf-8')); } catch(e){}
  }

  // 1. Fetch bangumi-data
  console.log("🌐 正在下載/查詢 bangumi-data 官方字典檔...");
  const bgmByAnilist = new Map();
  const bgmByTitle = new Map();
  try {
    const res = await fetch("https://raw.githubusercontent.com/bangumi-data/bangumi-data/master/dist/data.json");
    if (res.ok) {
      const bgmData = await res.json();
      (bgmData.items || []).forEach(item => {
        if (item.title) bgmByTitle.set(item.title, item);
        if (item.sites) {
          item.sites.forEach(s => {
            if ((s.site === 'aniList' || s.site === 'anilist') && s.id) {
              bgmByAnilist.set(String(s.id), item);
            }
          });
        }
      });
      console.log(`✅ 成功建立 bangumi-data 映射表：${bgmByAnilist.size} 筆 ID 對照。`);
    }
  } catch (e) {
    console.warn("⚠️ 無法連線下載 bangumi-data，將略過字典查詢。");
  }

  // Step A: 列出所有未翻譯動畫
  const untranslatedList = [];
  animeList.forEach(anime => {
    const aniId = anime.id.replace('anilist-', '');
    const zh = (anime.titleZh || '').trim();
    const ja = (anime.titleJa || '').trim();
    const en = (anime.titleEn || '').trim();

    const isUnknown = zh === '未知動畫' || !zh;
    const hasKana = kanaRegex.test(zh);
    const isSameAsJaWithKana = (zh === ja) && kanaRegex.test(ja);

    if (isUnknown || hasKana || isSameAsJaWithKana) {
      untranslatedList.push({
        id: aniId,
        fullId: anime.id,
        yearSeason: anime.yearSeason,
        titleZh: zh,
        titleJa: ja,
        titleEn: en
      });
    }
  });

  console.log(`\n📋 [Step A] 共偵測到 ${untranslatedList.length} 部未翻譯或包含日文文法的動畫。`);

  let logContent = `# 動畫 AI 與字典本地翻譯完整日誌 (Translation Log)\n\n`;
  logContent += `執行時間：${new Date().toLocaleString('zh-TW')}\n`;
  logContent += `偵測到未翻譯動畫總數：${untranslatedList.length} 部\n\n`;

  logContent += `## Step A: 未翻譯清單摘要 (前 50 筆列表)\n\n`;
  logContent += `| ID | 季度 | 目前標題 (未翻譯) | 原文/英文 |\n`;
  logContent += `|---|---|---|---|\n`;
  untranslatedList.slice(0, 50).forEach(u => {
    logContent += `| ${u.id} | ${u.yearSeason} | ${u.titleZh} | ${u.titleJa || u.titleEn} |\n`;
  });
  if (untranslatedList.length > 50) {
    logContent += `| ... | ... | ... (共 ${untranslatedList.length} 筆) | ... |\n`;
  }
  logContent += `\n`;

  // Step B: 查找 bangumi-data 有無對應翻譯資料
  const resolvedByDict = [];
  const needAiList = [];

  untranslatedList.forEach(item => {
    const bgmItem = bgmByAnilist.get(item.id) || (item.titleJa ? bgmByTitle.get(item.titleJa) : null);
    let dictZh = null;
    if (bgmItem && bgmItem.titleTranslate) {
      const hant = bgmItem.titleTranslate['zh-Hant'] || bgmItem.titleTranslate['zh-TW'] || bgmItem.titleTranslate['zh-HK'];
      const hans = bgmItem.titleTranslate['zh-Hans'] || bgmItem.titleTranslate['zh-CN'];
      if (hant && hant.length > 0) {
        dictZh = hant[0];
      } else if (hans && hans.length > 0) {
        dictZh = s2t(hans[0]);
      }
    }

    if (dictZh && dictZh !== item.titleZh && !kanaRegex.test(dictZh)) {
      resolvedByDict.push({
        ...item,
        newTitleZh: dictZh,
        source: 'bangumi-data'
      });
    } else {
      needAiList.push(item);
    }
  });

  console.log(`\n📚 [Step B] 透過 bangumi-data 字典成功匹配 ${resolvedByDict.length} 部；剩餘 ${needAiList.length} 部需啟動 AI 翻譯。`);

  // Step C: 啟動 AI 翻譯
  const resolvedByAi = [];
  if (needAiList.length > 0) {
    if (!process.env.GEMINI_API_KEY) {
      console.warn("⚠️ 找不到 GEMINI_API_KEY，略過 Step C (AI 翻譯)。請設定環境變數後執行。");
    } else {
      console.log(`\n🤖 [Step C] 啟動 AI 批次翻譯 (依據 ai_translate_prompt.md)... 共 ${needAiList.length} 部`);
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const promptText = fs.readFileSync(PROMPT_FILE, 'utf-8');
      const BATCH_SIZE = 30;

      for (let i = 0; i < needAiList.length; i += BATCH_SIZE) {
        const batch = needAiList.slice(i, i + BATCH_SIZE).map(x => ({
          id: x.id,
          titleJa: x.titleJa,
          titleEn: x.titleEn
        }));
        console.log(`正在執行 AI 批次翻譯 ${i + 1} ~ ${Math.min(i + BATCH_SIZE, needAiList.length)}...`);

        try {
          let response;
          for (let attempt = 1; attempt <= 3; attempt++) {
            try {
              response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: `${promptText}\n\n輸入清單：\n${JSON.stringify(batch, null, 2)}`
              });
              break;
            } catch (apiErr) {
              if (attempt === 3) throw apiErr;
              console.warn(`⚠️ API 暫時繁忙 (Attempt ${attempt}/3)，等待 3 秒重試...`);
              await new Promise(r => setTimeout(r, 3000));
            }
          }

          const rawAiText = (typeof response.text === 'function' ? response.text() : response.text) || '';
          const aiText = rawAiText.replace(/```json/g, '').replace(/```/g, '').trim();
          const aiResult = JSON.parse(aiText);

          aiResult.forEach(res => {
            if (res.titleZh && res.id) {
              const orig = needAiList.find(x => x.id === String(res.id));
              if (orig && res.titleZh !== orig.titleZh) {
                resolvedByAi.push({
                  ...orig,
                  newTitleZh: res.titleZh,
                  source: 'ai'
                });
              }
            }
          });
        } catch (err) {
          console.error(`❌ 批次 ${i} 失敗:`, err.message);
        }

        if (i + BATCH_SIZE < needAiList.length) {
          await new Promise(r => setTimeout(r, 1500));
        }
      }
    }
  }

  // Step D: 更新與彙整
  const allResolved = [...resolvedByDict, ...resolvedByAi];
  let updatedCount = 0;

  allResolved.forEach(res => {
    const idStr = res.id;
    if (!overrideData[idStr]) overrideData[idStr] = {};
    overrideData[idStr].titleZh = res.newTitleZh;
    overrideData[idStr].source = res.source;

    const target = animeList.find(a => a.id === `anilist-${idStr}`);
    if (target) {
      target.titleZh = res.newTitleZh;
      updatedCount++;
    }
  });

  fs.writeFileSync(OVERRIDE_FILE, JSON.stringify(overrideData, null, 2), 'utf-8');
  fs.writeFileSync(DATA_FILE, JSON.stringify(animeList, null, 2), 'utf-8');

  console.log(`\n✨ [Step D] 翻譯完成並寫入資料庫！共更新了 ${updatedCount} 部動畫（字典匹配 ${resolvedByDict.length} 部，AI 翻譯 ${resolvedByAi.length} 部）。`);

  // Step E: 記錄完整 Log
  logContent += `## Step D & E: 翻譯完成變化完整清單 (總計 ${allResolved.length} 筆)\n\n`;
  logContent += `| ID | 季度 | 舊標題 | -> | 新繁中標題 | 翻譯來源 |\n`;
  logContent += `|---|---|---|---|---|---|\n`;

  allResolved.forEach(r => {
    logContent += `| ${r.id} | ${r.yearSeason} | ${r.titleZh} | -> | **${r.newTitleZh}** | \`${r.source}\` |\n`;
  });

  fs.writeFileSync(LOG_FILE, logContent, 'utf-8');
  console.log(`\n📜 [Step E] 完整紀錄 log 已儲存於：${LOG_FILE}`);
  console.log(`您可以開啟 ${LOG_FILE} 查看完整清單！`);
}

translateMissing();

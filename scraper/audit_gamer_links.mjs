import fs from 'fs';
import path from 'path';
import { resolveGamerStreamingUrl, resolveGamerInfo } from './scraper_utils.mjs';

// 🛑 核心規範：讀取專用盤查模式（READ-ONLY AUDIT MODE）
// 1. 絕對不可更改任何檔案（不修改 anime_data.json、custom_override.json 或通用設定）。
// 2. 僅限本次排查用更緩慢的速度：5 秒一次查詢巴哈姆特及動畫瘋。
// 3. 完整依照洗滌 Skill (gamer-link-washing) 描述執行。
// 4. 排查範圍包括所有動畫（3,570 筆全數檢查）。

const DATA_FILE = path.join(process.cwd(), 'public', 'anime_data.json');
const OVERRIDE_FILE = path.join(process.cwd(), 'public', 'custom_override.json');
const REPORT_MD_FILE = path.join(process.cwd(), 'scraper', 'gamer_link_audit_report.md');
const REPORT_JSON_FILE = path.join(process.cwd(), 'scraper', 'gamer_link_audit_report.json');
const REQUEST_INTERVAL_MS = 5000; // 5 秒一次查詢

async function runAudit() {
  console.log('====================================================');
  console.log('🛡️ 巴哈姆特動畫瘋連結與標題 全庫標準洗滌盤查 (Read-Only Audit)');
  console.log('⏳ 查詢間隔：5000 毫秒 (5 秒 / 次)');
  console.log('🎯 範圍：全庫所有動畫作品');
  console.log('🛑 承諾：絕不修改任何資料檔案，僅列出變更與錯誤供手動指揮修正！');
  console.log('====================================================\n');

  // 1. 讀取 anime_data.json
  if (!fs.existsSync(DATA_FILE)) {
    console.error('❌ 找不到 public/anime_data.json');
    return;
  }
  const animeList = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));

  // 讀取 custom_override.json 以判斷手動權威 (Priority 1)
  let overrideData = {};
  if (fs.existsSync(OVERRIDE_FILE)) {
    try { overrideData = JSON.parse(fs.readFileSync(OVERRIDE_FILE, 'utf-8')); } catch (e) {}
  }

  // 2. 下載 bangumi-data 官方字典檔 (黃金權威優先原則)
  console.log('🌐 正在自 GitHub 下載最新的 bangumi-data 官方字典...');
  const bgmMap = new Map();
  const titleJaMap = new Map();
  try {
    const res = await fetch("https://raw.githubusercontent.com/bangumi-data/bangumi-data/master/dist/data.json");
    if (res.ok) {
      const data = await res.json();
      (data.items || []).forEach(item => {
        const aniListSite = item.sites?.find(s => s.site === 'aniList');
        if (aniListSite && aniListSite.id) {
          bgmMap.set(String(aniListSite.id), item);
        }
        if (item.title) {
          const gamerSite = item.sites?.find(s => s.site === 'gamer' || s.site === 'gamer_hk');
          if (gamerSite && gamerSite.id) {
            titleJaMap.set(item.title, `https://acg.gamer.com.tw/acgDetail.php?s=${gamerSite.id}`);
          }
        }
      });
      console.log(`✅ bangumi-data 載入完成，建立 ${bgmMap.size} 筆 AniList 對應，${titleJaMap.size} 筆日文百科對應。`);
    } else {
      console.warn('⚠️ 下載 bangumi-data 失敗，將僅依賴現有 URL 與標題比對。');
    }
  } catch (err) {
    console.warn('⚠️ 取得 bangumi-data 發生錯誤:', err.message);
  }

  // 4. 排查範圍包括所有動畫
  const targets = animeList;
  console.log(`\n📋 共啟動 ${targets.length} 部動畫作品的全面深度盤查。\n`);

  const auditResults = [];
  let checkedCount = 0;

  for (let i = 0; i < targets.length; i++) {
    const item = targets[i];
    const aniListId = String(item.id).replace('anilist-', '');
    const ak = item.id.toString().startsWith('anilist-') ? item.id : `anilist-${item.id}`;
    const overrideObj = overrideData[ak] || {};
    const isManualTitle = overrideObj.source === 'manual';
    checkedCount++;

    const currentGamerObj = item.streamings?.find(s => s.site === 'gamer' || s.site === 'gamer_hk' || (s.name && s.name.includes('動畫瘋')));
    const currentUrl = currentGamerObj ? currentGamerObj.url : null;

    let expectedUrl = null;
    let officialTitle = null;
    let madeNetworkRequest = false;

    // 依照標準洗滌規範 (gamer-link-washing) 執行
    // 規則 1: 黃金權威優先原則 (bangumi-data ACG 百科優先)
    const bgmItem = bgmMap.get(aniListId);
    let acgUrl = null;
    if (bgmItem) {
      const gamerSite = bgmItem.sites?.find(s => s.site === 'gamer' || s.site === 'gamer_hk');
      if (gamerSite && gamerSite.id) {
        acgUrl = `https://acg.gamer.com.tw/acgDetail.php?s=${gamerSite.id}`;
      }
    }
    if (!acgUrl && item.titleJa && titleJaMap.has(item.titleJa)) {
      acgUrl = titleJaMap.get(item.titleJa);
    }
    if (!acgUrl && currentUrl && currentUrl.includes('acgDetail.php')) {
      acgUrl = currentUrl;
    }

    // 規則 2: 繁中標題優先校正與播放頁提取規則 (絕不盲目搜尋)
    if (acgUrl) {
      process.stdout.write(`[${checkedCount}/${targets.length}] 查閱百科: ${item.titleZh.padEnd(20, ' ')} ... `);
      madeNetworkRequest = true;
      const res = await resolveGamerInfo(acgUrl, item.titleZh);
      if (res.isBlocked) {
        console.log(`⚠️ 遭防護攔截/維修，跳過。`);
      } else {
        officialTitle = res.officialTitle;
        if (res.resolvedUrl) {
          // 直接提取播放頁：若 HTML 內包含 ani.gamer.com.tw，必須直接提取並採用
          expectedUrl = res.resolvedUrl;
        } else {
          // 百科無播放連結（如未開播新番），保留並還原為 ACG 百科頁面
          expectedUrl = acgUrl;
        }
      }
    } else {
      // 規則 3: 80% 相似度檢驗與防呆還原規則 (當無 ACG 百科時啟動標題搜尋)
      // 若現有資料本身也無巴哈連結且無百科，嘗試搜尋；為了節省無謂請求，若標題搜尋過可依規範執行
      process.stdout.write(`[${checkedCount}/${targets.length}] 標題搜尋: ${item.titleZh.padEnd(20, ' ')} ... `);
      madeNetworkRequest = true;
      const searchedUrl = await resolveGamerStreamingUrl(item.titleZh);
      if (searchedUrl) {
        expectedUrl = searchedUrl;
      }
    }

    // 比較現有與標準洗滌結果
    let isMismatch = false;
    const reasons = [];

    // 檢查 URL 差異
    if (currentUrl !== expectedUrl) {
      if (!currentUrl && expectedUrl) {
        isMismatch = true;
        reasons.push('發現巴哈授權 (現有無連結 ➜ 建議新增)');
      } else if (currentUrl && !expectedUrl) {
        isMismatch = true;
        reasons.push('建議移除連結 (現有連結在百科與搜尋中皆無法對應)');
      } else if (currentUrl && expectedUrl) {
        isMismatch = true;
        reasons.push(`連結不一致 (現有: ${currentUrl} ➜ 建議: ${expectedUrl})`);
      }
    }

    // 檢查標題差異 (規則 4: Priority 1 Manual 最高權威不覆蓋，且 custom_override 已記錄為 gamer 者不報錯)
    if (officialTitle && !isManualTitle && overrideObj.titleZh !== officialTitle && officialTitle !== item.titleZh && !officialTitle.includes('系統維修') && !officialTitle.includes('巴哈姆特')) {
      isMismatch = true;
      reasons.push(`官方繁中譯名校正 (現有: "${overrideObj.titleZh || item.titleZh}" ➜ 巴哈官方: "${officialTitle}")`);
    }

    if (isMismatch) {
      console.log(`⚠️ 發現變更/錯誤！ [${reasons.join('；')}]`);
      auditResults.push({
        id: item.id,
        aniListId: Number(aniListId),
        titleZh: item.titleZh,
        titleJa: item.titleJa || '',
        yearSeason: item.yearSeason || '',
        currentUrl: currentUrl || '無',
        expectedUrl: expectedUrl || '無',
        officialTitle: officialTitle || item.titleZh,
        reasons: reasons
      });
    } else {
      console.log(`✅ 一致`);
    }

    // 定期儲存報告 (每檢查 20 筆或最後一筆時儲存)
    if (checkedCount % 20 === 0 || checkedCount === targets.length) {
      saveReports(auditResults, checkedCount, targets.length);
    }

    // 規則 2: 僅限這次排查用更緩慢的速度，5 秒一次查詢
    if (madeNetworkRequest) {
      await new Promise(r => setTimeout(r, REQUEST_INTERVAL_MS));
    }
  }

  console.log('\n====================================================');
  console.log(`🎉 全庫排查完成！共檢查 ${targets.length} 筆，發現 ${auditResults.length} 筆變更與錯誤。`);
  console.log(`📄 報告已匯出至：`);
  console.log(`   - Markdown 列表: ${REPORT_MD_FILE}`);
  console.log(`   - JSON 資料庫:   ${REPORT_JSON_FILE}`);
  console.log('====================================================\n');
}

function saveReports(results, current, total) {
  fs.writeFileSync(REPORT_JSON_FILE, JSON.stringify({
    generatedAt: new Date().toISOString(),
    progress: `${current}/${total}`,
    totalDiscrepancies: results.length,
    results: results
  }, null, 2), 'utf-8');

  let md = `# 🛡️ 巴哈姆特動畫瘋 全庫標準洗滌盤查報告 (Read-Only Audit Report)\n\n`;
  md += `> **生成時間**：${new Date().toLocaleString('zh-TW')}\n`;
  md += `> **盤查進度**：${current} / ${total} (全庫)\n`;
  md += `> **發現變更與錯誤**：共 ${results.length} 筆\n`;
  md += `> **遵守規範**：100% 唯讀不更改檔案、慢速 5 秒查詢、完整依照洗滌 Skill、覆蓋全庫。\n\n`;

  if (results.length === 0) {
    md += `目前所有檢查過的項目皆與標準洗滌結果完全一致！\n`;
  } else {
    md += `## 📋 變更與錯誤清單\n\n`;
    md += `| AniList ID | 現有中文名稱 | 巴哈官方譯名 | 變更/錯誤原因 | 現有連結 | 洗滌建議連結 |\n`;
    md += `| :--- | :--- | :--- | :--- | :--- | :--- |\n`;

    results.forEach(r => {
      const curLink = r.currentUrl === '無' ? '無' : `[現有連結](${r.currentUrl})`;
      const expLink = r.expectedUrl === '無' ? '無' : `[建議連結](${r.expectedUrl})`;
      md += `| \`${r.id}\` | **${r.titleZh}** | ${r.officialTitle} | ⚠️ ${r.reasons.join('<br>')} | ${curLink} | ${expLink} |\n`;
    });

    md += `\n---\n\n### 💡 手動指揮修正說明\n`;
    md += `所有檢查結果已記錄於 \`gamer_link_audit_report.json\`。您可以隨時下達手動修正指令，AI 將依指示幫您更新資料庫。\n`;
  }

  fs.writeFileSync(REPORT_MD_FILE, md, 'utf-8');
}

runAudit().catch(err => {
  console.error('❌ 盤查過程發生未預期錯誤:', err);
});

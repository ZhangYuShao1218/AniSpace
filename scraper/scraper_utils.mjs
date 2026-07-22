import fs from 'fs';
import path from 'path';
import { GoogleGenAI } from '@google/genai';
import * as cheerio from 'cheerio';

const axios = {
    get: async (url, opts = {}) => {
        const res = await fetch(url, opts);
        const text = await res.text();
        try {
            return { data: JSON.parse(text) };
        } catch {
            return { data: text };
        }
    }
};

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Searches Bahamut Anime Crazy for a title and returns the most relevant match.
 * @param {string} title 
 * @returns {Promise<{titleZh: string, coverImage: string} | null>}
 */
export async function fetchBahamutData(title) {
    if (!title) return null;
    try {
        const searchUrl = `https://ani.gamer.com.tw/search.php?keyword=${encodeURIComponent(title)}`;
        const { data } = await axios.get(searchUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });
        const $ = cheerio.load(data);
        const bestMatch = $('a.theme-list-main').first();
        
        if (bestMatch.length > 0) {
            const zhTitle = bestMatch.find('.theme-name').text().trim();
            const href = bestMatch.attr('href') || '';
            const snMatch = href.match(/sn=(\d+)/);
            const sn = snMatch ? snMatch[1] : null;
            
            return {
                titleZh: zhTitle,
                coverImage: sn ? `https://p2.bahamut.com.tw/anime/${sn}.jpg` : ''
            };
        }
    } catch (error) {
        console.error(`[Bahamut] Error searching for "${title}":`, error.message);
    }
    return null;
}

/**
 * Fetches seasonal anime data from ACGSecrets.hk.
 * @param {number} year 
 * @param {string} season WINTER | SPRING | SUMMER | FALL
 * @returns {Promise<Map<string, any>>}
 */
export async function fetchACGSecretsSeasonal(year, season) {
    const seasonToMonth = { 'WINTER': '01', 'SPRING': '04', 'SUMMER': '07', 'FALL': '10' };
    const month = seasonToMonth[season.toUpperCase()];
    if (!month) return new Map();

    const url = `https://acgsecrets.hk/bangumi/${year}${month}/`;
    const animeMap = new Map();

    try {
        const { data } = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });
        const $ = cheerio.load(data);

        $('.anime-item').each((_, el) => {
            const title = $(el).find('.anime-name').text().trim();
            // Some items might have date/time info
            const timeInfo = $(el).find('.anime-extra').text().trim();
            
            // Try to find the Japanese title from the context if possible (often in scripts)
            // But for now we just map by the name we found.
            if (title) {
                animeMap.set(title, {
                    titleZh: title,
                    timeInfo: timeInfo
                });
            }
        });

        // Optional: Also check for the script data which often contains more stable titles
        const scriptData = $('script[type="application/ld+json"]').html();
        if (scriptData) {
            try {
                const json = JSON.parse(scriptData);
                if (Array.isArray(json)) {
                    json.forEach(item => {
                        if (item['@type'] === 'TVSeries' || item['@type'] === 'Movie') {
                            const name = item.name;
                            const altName = item.alternateName;
                            if (name) {
                                animeMap.set(name, {
                                    titleZh: name,
                                    alternateName: Array.isArray(altName) ? altName[0] : altName
                                });
                                if (Array.isArray(altName)) {
                                    altName.forEach(alt => animeMap.set(alt, { titleZh: name }));
                                } else if (altName) {
                                    animeMap.set(altName, { titleZh: name });
                                }
                            }
                        }
                    });
                }
            } catch (e) {
                // Ignore parse errors
            }
        }

    } catch (error) {
        console.error(`[ACGSecrets] Error fetching season ${year}${month}:`, error.message);
    }

    return animeMap;
}

/**
 * Fallback search using Bangumi API.
 * @param {string} title 
 * @returns {Promise<{titleZh: string, coverImage: string} | null>}
 */
export async function fetchBangumiData(title) {
    if (!title) return null;
    try {
        const res = await axios.get(`https://api.bgm.tv/search/subject/${encodeURIComponent(title)}?type=2&responseGroup=small`);
        const json = res.data;
        if (json && json.list && json.list.length > 0) {
            const item = json.list[0];
            return {
                titleZh: item.name_cn || item.name || '',
                coverImage: item.images?.large || item.images?.common || ''
            };
        }
    } catch (error) {
        // Quietly fail
    }
    return null;
}

/**
 * Calculate title similarity using Bigram (Dice Coefficient) and exact substring match rules.
 * Returns a score between 0 and 1.
 * @param {string} str1 
 * @param {string} str2 
 * @returns {number}
 */
export function calculateTitleSimilarity(str1, str2) {
    if (!str1 || !str2) return 0;
    const clean = s => s.toLowerCase().replace(/[^\w\u4e00-\u9fa5]/g, '');
    const s1 = clean(str1);
    const s2 = clean(str2);
    if (!s1 || !s2) return 0;
    if (s1 === s2) return 1.0;
    
    // Check if one contains the other but differs significantly in season numbers
    const getBigrams = s => {
        const map = new Map();
        for (let i = 0; i < s.length - 1; i++) {
            const bg = s.substring(i, i + 2);
            map.set(bg, (map.get(bg) || 0) + 1);
        }
        return map;
    };
    if (s1.length < 2 || s2.length < 2) {
        return s1 === s2 ? 1.0 : 0;
    }
    const bg1 = getBigrams(s1);
    const bg2 = getBigrams(s2);
    let intersection = 0;
    for (const [bg, count] of bg1) {
        if (bg2.has(bg)) {
            intersection += Math.min(count, bg2.get(bg));
        }
    }
    return (2 * intersection) / (s1.length - 1 + s2.length - 1);
}

async function searchGamerSingle(keyword, expectedTitle = null, retryCount = 1) {
    if (!keyword || keyword.length < 2) return null;
    const targetTitle = expectedTitle || keyword;
    try {
        const searchUrl = `https://ani.gamer.com.tw/search.php?keyword=${encodeURIComponent(keyword)}`;
        const { data } = await axios.get(searchUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });
        if (typeof data === 'string' && (data.includes('系統維修') || data.includes('Cloudflare') || data.includes('請稍後'))) {
            if (retryCount > 0) {
                await new Promise(r => setTimeout(r, 4000));
                return await searchGamerSingle(keyword, expectedTitle, retryCount - 1);
            }
            return null;
        }
        const $ = cheerio.load(data);
        let bestUrl = null;
        let highestSim = -1;

        $('a.theme-list-main').each((_, el) => {
            const foundTitle = $(el).find('.theme-name').text().trim();
            const href = $(el).attr('href') || '';
            const snMatch = href.match(/sn=(\d+)/);
            if (foundTitle && snMatch && snMatch[1]) {
                const sim = calculateTitleSimilarity(targetTitle, foundTitle);
                if (sim >= 0.8 && sim > highestSim) {
                    highestSim = sim;
                    bestUrl = `https://ani.gamer.com.tw/animeRef.php?sn=${snMatch[1]}`;
                }
            }
        });

        if (bestUrl) {
            console.log(`🎯 [動畫瘋搜尋] 成功匹配 "${targetTitle}" (相似度: ${(highestSim*100).toFixed(1)}%) ➜ ${bestUrl}`);
            return bestUrl;
        } else {
            console.log(`⚠️ [動畫瘋搜尋] 搜尋 "${keyword}" 回傳結果與目標 "${targetTitle}" 相似度皆低於 80%，拋棄搜尋結果。`);
            return null;
        }
    } catch (e) {
        if (retryCount > 0) {
            await new Promise(r => setTimeout(r, 4000));
            return await searchGamerSingle(keyword, expectedTitle, retryCount - 1);
        }
    }
    return null;
}

/**
 * Resolves an anime title to its true Bahamut Anime Crazy watch URL with intelligent fallback matching and strict >= 80% similarity check.
 * @param {string} title 
 * @returns {Promise<string | null>}
 */
export async function resolveGamerStreamingUrl(title) {
    if (!title) return null;
    let res = await searchGamerSingle(title, title);
    if (res) return res;

    const cleanTitle = title.replace(/[～〜\-─!！:：,，。?？\s]+/g, ' ').trim();
    if (cleanTitle !== title) {
        res = await searchGamerSingle(cleanTitle, title);
        if (res) return res;
    }
    return null;
}

/**
 * Fetches official Bahamut title and streaming URL purely from an acgDetail URL without fuzzy search.
 * @param {string} acgDetailUrl 
 * @param {string} currentTitle 
 * @returns {Promise<{ resolvedUrl: string | null, officialTitle: string | null, isBlocked?: boolean }>}
 */
export async function resolveGamerInfo(acgDetailUrl, currentTitle) {
    let officialTitle = null;
    let resolvedUrl = null;

    if (acgDetailUrl && acgDetailUrl.includes('acgDetail.php')) {
        try {
            const res = await fetch(acgDetailUrl, {
                headers: { 
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' 
                }
            });
            const html = await res.text();
            const blockedKeywords = ['系統維修', '系統維護', 'Cloudflare', '請稍後', 'Forbidden', '發生錯誤', 'Access Denied', '驗證碼', '注意力檢查'];
            if (res.status === 403 || res.status === 503 || blockedKeywords.some(kw => html.includes(kw))) {
                console.warn(`[防呆保護] 遭遇巴哈姆特防護或系統維護攔截 (${acgDetailUrl})`);
                return { resolvedUrl: null, officialTitle: null, isBlocked: true };
            }
            const $ = cheerio.load(html);
            const h1 = $('h1').text().trim();
            if (h1 && !blockedKeywords.some(kw => h1.includes(kw)) && h1 !== '巴哈姆特' && h1 !== '巴哈姆特電玩資訊站') {
                officialTitle = h1;
            }
            $('a').each((_, el) => {
                let href = $(el).attr('href') || '';
                if (href.includes('ani.gamer.com.tw') && (href.includes('animeVideo.php') || href.includes('animeRef.php')) && !resolvedUrl) {
                    if (href.startsWith('//')) href = 'https:' + href;
                    else if (href.startsWith('http://')) href = href.replace('http://', 'https://');
                    resolvedUrl = href;
                }
            });
        } catch (e) {
            console.warn(`[防呆保護] 請求 ACG 百科失敗: ${e.message}`);
            return { resolvedUrl: null, officialTitle: null, isBlocked: true };
        }
    }

    return { resolvedUrl, officialTitle, isBlocked: false };
}

/**
 * Merge duplicate gamer streamings (gamer and gamer_hk) into a single unified platform,
 * and perform strict deduplication on all streaming sites to prevent double-linking.
 * @param {Array} streamings
 * @returns {Array}
 */
export function normalizeAndMergeStreamings(streamings) {
  if (!streamings || !Array.isArray(streamings) || streamings.length === 0) return streamings;
  const mergedMap = new Map();
  let hasGamerTw = false;
  let hasGamerHk = false;
  let gamerUrl = '';

  streamings.forEach(st => {
    const isGamer = st?.site === 'gamer' || st?.site === 'gamer_hk' || (st?.name && st.name.includes('動畫瘋'));
    if (isGamer) {
      if (st.site === 'gamer' || st.region === '台灣' || st.region?.includes('台灣')) hasGamerTw = true;
      if (st.site === 'gamer_hk' || st.region === '港澳' || st.region?.includes('港澳')) hasGamerHk = true;
      if (st.url?.includes('ani.gamer.com.tw')) {
        gamerUrl = st.url;
      } else if (!gamerUrl && st.url) {
        gamerUrl = st.url;
      }
    }
  });

  // 輔助函式：標準化 URL 以便比對（去除結尾斜線、部分 query tracking 參數）
  const cleanUrl = (url) => {
    if (!url) return '';
    try {
      let u = url.trim().replace(/\/+$/, ''); // 去除結尾斜線
      if (u.includes('?')) {
        // 若不是動畫瘋或 YouTube 播放清單，去除查詢參數避免因 spm_id 等 tracking 導致判定不同
        if (!u.includes('gamer.com.tw') && !u.includes('youtube.com/playlist') && !u.includes('mikanani.me') && !u.includes('dmhy.org')) {
          u = u.split('?')[0];
        }
      }
      return u;
    } catch(e) { return url; }
  };

  streamings.forEach(st => {
    if (!st || !st.site) return;
    const copy = { ...st };
    if (copy.region === '中國大陸' || copy.region === '大陸') copy.region = '中國';
    if (copy.site.startsWith('bilibili') || copy.name?.includes('哔哩哔哩') || copy.name?.toLowerCase().includes('bilibili')) {
      copy.name = 'Bilibili';
      if (copy.region === '港澳' || copy.region === '港澳台' || copy.region === '台灣') {
        copy.site = 'bilibili_tw';
        copy.region = '台灣';
      }
    }
    const isGamer = copy.site === 'gamer' || copy.site === 'gamer_hk' || (copy.name && copy.name.includes('動畫瘋'));
    if (isGamer) {
      if (!mergedMap.has('gamer_merged')) {
        let region = '台港澳';
        if (hasGamerTw && !hasGamerHk) region = '台灣';
        else if (!hasGamerTw && hasGamerHk) region = '港澳';
        mergedMap.set('gamer_merged', {
          site: 'gamer',
          name: '動畫瘋',
          region,
          url: gamerUrl || copy.url || ''
        });
      }
    } else {
      // 🚨 嚴格去重防呆：對於非 bilibili 等多區域平台，同一 site 只保留最優先或區域最廣的一份
      const isMultiRegionSite = copy.site.startsWith('bilibili') || copy.site.startsWith('muse_') || copy.site.startsWith('ani_one');
      const dedupeKey = isMultiRegionSite ? `${copy.site}_${cleanUrl(copy.url)}` : copy.site;
      
      if (!mergedMap.has(dedupeKey)) {
        mergedMap.set(dedupeKey, copy);
      } else if (!isMultiRegionSite) {
        // 若已存在相同 site，優先選擇區域是「台灣 / 台港澳」或 URL 更標準的項目覆蓋
        const existing = mergedMap.get(dedupeKey);
        const regionPriority = { '台灣': 1, '台港澳': 2, '港澳台': 3, '亞洲': 4, '全球': 5, '港澳': 6, '日本': 7, '中國': 8 };
        if ((regionPriority[copy.region] || 99) < (regionPriority[existing.region] || 99)) {
          mergedMap.set(dedupeKey, copy);
        }
      }
    }
  });

  const regionPriority = { '台灣': 1, '台港澳': 2, '港澳台': 3, '亞洲': 4, '全球': 5, '港澳': 6, '日本': 7, '中國': 8, '中國大陸': 8, '大陸': 8 };
  return Array.from(mergedMap.values()).sort((a, b) => (regionPriority[a.region] || 99) - (regionPriority[b.region] || 99));
}

export const aiMatchedRecords = [];

/**
 * 兩階段精確物理對齊 AniList 項目與 bangumi-data 項目/網址（判斷是否有原生的 bangumi_data 對應資料）：
 * A. AniList ID 精確對照
 * C. 100% 日文標題精確對照
 *
 * @param {string|number} aniListId 
 * @param {string} titleJa 
 * @param {Object} customOverride 
 * @param {Map} bgmIdMap 
 * @param {Map} bgmTitleMap 
 * @returns {any|null}
 */
export function matchBangumiItem(aniListId, titleJa, customOverride, bgmIdMap, bgmTitleMap) {
  if (!bgmIdMap && !bgmTitleMap) return null;
  
  // A. AniList ID
  if (aniListId && bgmIdMap) {
    const shortId = String(aniListId).replace('anilist-', '');
    if (bgmIdMap.has(shortId)) return bgmIdMap.get(shortId);
    if (bgmIdMap.has(`anilist-${shortId}`)) return bgmIdMap.get(`anilist-${shortId}`);
  }

  // C. 100% 日文標題精確對照
  if (titleJa && bgmTitleMap) {
    const cleanTitle = titleJa.trim();
    if (bgmTitleMap.has(cleanTitle)) {
      return bgmTitleMap.get(cleanTitle);
    }
  }

  return null;
}

/**
 * 純本地程式化標題正規化對齊演算法 (Pure Algorithmic Title Normalization Matcher)：
 * 針對只允許「標點符號、空格、半形全形差異」的設定條件，
 * 透過 Unicode 標準化 (NFKC) 與全符號移除進行高精度極速對照 (零 Token、秒殺)。
 */
export async function runTitleNormalizationMatch(unlinkedList, bgmTitleMap) {
  if (!unlinkedList || unlinkedList.length === 0 || !bgmTitleMap || bgmTitleMap.size === 0) return [];

  console.log(`\n⚡ 啟動本地程式化標題正規化對照引擎：針對 ${unlinkedList.length} 部無對應動畫，開始進行極速正規化比對...`);
  
  const validResults = [];

  // 1. 本地演算法正規化核心：處理全半形、標點符號、空格與羅馬數字
  const normalizeTitle = (str) => {
    if (!str) return '';
    return str
      .normalize('NFKC') // Unicode 標準化：全形英數轉半形、半形假名轉全形、羅馬數字 (Ⅱ->II) 統一
      .replace(/[\p{P}\p{S}\s]/gu, '') // 移除所有標點符號 (\p{P})、特殊符號/愛心/星號/中點 (\p{S}) 與空白 (\s)
      .toLowerCase(); // 統一轉為小寫
  };

  // 2. 建立 Bangumi 字典的正規化索引 Map
  const normalizedBgmMap = new Map();
  for (const [title, item] of bgmTitleMap.entries()) {
    const norm = normalizeTitle(title);
    if (norm && !normalizedBgmMap.has(norm)) {
      const bgmSite = item?.sites?.find(s => s.site === 'bangumi');
      const bgmId = bgmSite?.id || (item?.sites && item.sites[0]?.id) || 'N/A';
      normalizedBgmMap.set(norm, { title, bgmId });
    }
  }

  // 3. 遍歷未對應動畫進行極速 Hash 比對
  unlinkedList.forEach(u => {
    const normJa = normalizeTitle(u.titleJa);
    if (normJa && normalizedBgmMap.has(normJa)) {
      const match = normalizedBgmMap.get(normJa);
      if (!aiMatchedRecords.some(r => r.id === u.id)) {
        aiMatchedRecords.push({
          id: u.id,
          titleJa: u.titleJa || '',
          matchedBgmTitle: match.title,
          bgmId: match.bgmId
        });
        console.log(`⚡ [正規化對照命中] [${u.id}] "${u.titleJa}" ➜ 字典:"${match.title}" (BGM ID: ${match.bgmId})`);
      }
      validResults.push({ id: u.id, titleJa: u.titleJa, matchedBgmTitle: match.title, bgmId: match.bgmId });
    }
  });

  console.log(`✨ 本地程式化正規化對照執行完畢！共成功對齊 ${validResults.length} 部動畫 (耗時近乎 0 秒，零 Token 消耗)！\n`);
  return validResults;
}

// 保持相容別名
export const runAiBangumiTitleMatch = runTitleNormalizationMatch;





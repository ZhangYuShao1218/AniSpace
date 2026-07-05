import fs from 'fs';
import path from 'path';

const ANIME_DATA_PATH = path.join(process.cwd(), 'public', 'anime_data.json');
const OVERRIDE_PATH = path.join(process.cwd(), 'public', 'custom_override.json');
const REPORT_PATH = path.join(process.cwd(), 'scraper', 'gamer_link_audit_report.json');
const CACHE_PATH = path.join(process.cwd(), 'scraper', 'gamer_url_cache.json');

console.log('🚀 開始執行指揮官下達的 5 大修正命令 (嚴格遵守優先權序)...\n');

const animeData = JSON.parse(fs.readFileSync(ANIME_DATA_PATH, 'utf8'));
const overrideData = JSON.parse(fs.readFileSync(OVERRIDE_PATH, 'utf8'));
const reportData = JSON.parse(fs.readFileSync(REPORT_PATH, 'utf8'));
const cacheData = JSON.parse(fs.readFileSync(CACHE_PATH, 'utf8'));

const animeMap = new Map();
animeData.forEach(item => animeMap.set(item.id, item));

let stats = {
  p1Applied: 0,
  p2Applied: 0,
  p3Applied: 0,
  p4Applied: 0,
  p5Applied: 0
};

// Helper: update or add gamer streaming link
function setGamerLink(id, url) {
  const item = animeMap.get(id);
  if (!item) {
    console.warn(`⚠️ 找不到 ID: ${id}`);
    return;
  }
  if (!item.streamings) item.streamings = [];
  const st = item.streamings.find(s => s.site === 'gamer' || s.site === 'gamer_hk');
  if (st) {
    st.url = url;
  } else {
    item.streamings.push({
      site: 'gamer',
      name: '動畫瘋',
      region: '台港澳',
      url: url
    });
  }
  cacheData[id] = url;
  const shortId = id.replace('anilist-', '');
  cacheData[shortId] = url;
}

// Helper: remove gamer streaming link
function removeGamerLink(id) {
  const item = animeMap.get(id);
  if (!item || !item.streamings) return;
  item.streamings = item.streamings.filter(s => s.site !== 'gamer' && s.site !== 'gamer_hk');
  delete cacheData[id];
  const shortId = id.replace('anilist-', '');
  delete cacheData[shortId];
}

// Helper: update titleZh and lock in custom_override
function setTitleZh(id, newTitle) {
  const item = animeMap.get(id);
  if (item) {
    item.titleZh = newTitle;
  }
  overrideData[id] = overrideData[id] || {};
  overrideData[id].titleZh = newTitle;
  overrideData[id].source = 'manual';
  const shortId = id.replace('anilist-', '');
  overrideData[shortId] = overrideData[shortId] || {};
  overrideData[shortId].titleZh = newTitle;
  overrideData[shortId].source = 'manual';
}

// ----------------------------------------------------
// Part 1: 第一部分(真正的連結與跨季錯置) 全部修正
// ----------------------------------------------------
console.log('--- 處理 Part 1: 真正的連結與跨季錯置 ---');
const p1Items = reportData.results.filter(x => x.reasons[0] && x.reasons[0].includes('連結不一致'));
p1Items.forEach(x => {
  setGamerLink(x.id, x.expectedUrl);
  stats.p1Applied++;
  console.log(`  [P1] ${x.titleZh} (${x.id}) -> ${x.expectedUrl}`);
});

// ----------------------------------------------------
// Part 2: 第二部分(發現新巴哈授權) 排除 19 部，其餘更新
// ----------------------------------------------------
console.log('\n--- 處理 Part 2: 發現新巴哈授權 ---');
const p2Exclude = [
  'Fate/stay night - 無限劍製',
  '無頭騎士異聞錄 DuRaRaRa!!',
  'K-ON!! 輕音部!! 計劃!',
  'Little Busters !',
  '義呆利 The Beautiful World',
  '約會大作戰 DATE A LIVE',
  '偶像大師 灰姑娘女孩',
  'Re：從零開始的異世界生活',
  '魯邦三世 PART5',
  '文豪Stray Dogs 『獨自前行』',
  '艾梅洛閣下II世事件簿-魔眼蒐集列車Grace note-',
  'BanG Dream!第二季',
  '異世界四重奏',
  '小書痴的下剋上：為了成為圖書管理員不擇手段！',
  'GIVEN 被贈與的未來',
  '平凡職業造就世界最強',
  '映畫 ギヴン',
  '賽馬娘 Pretty Derby 新時代之門',
  '精靈幻想記'
];
const p2Items = reportData.results.filter(x => x.reasons[0] && x.reasons[0].includes('發現巴哈授權'));
p2Items.forEach(x => {
  const isExcluded = p2Exclude.some(e => x.titleZh.includes(e) || e.includes(x.titleZh));
  if (!isExcluded) {
    setGamerLink(x.id, x.expectedUrl);
    stats.p2Applied++;
    console.log(`  [P2 新增] ${x.titleZh} (${x.id}) -> ${x.expectedUrl}`);
  } else {
    console.log(`  [P2 略過] ${x.titleZh}`);
  }
});

// ----------------------------------------------------
// Part 4: 第四部份 排除 58 部，其餘修正譯名 (優先於 Part 3 & 5 執行以避免覆蓋手動指令)
// ----------------------------------------------------
console.log('\n--- 處理 Part 4: 官方繁中譯名優化 ---');
const p4Exclude = [
  '『我的英雄學院』No.170＋1『More』',
  '靈異教師神眉',
  '地縛少年花子君 第二季',
  '怪獸8號 保科特休日',
  '盾之勇者成名錄 第三季',
  '哥布林殺手 第二季',
  '文豪Stray Dogs 第5季',
  '萊莎的鍊金工房 ～常闇女王與秘密藏身處～',
  '國王排名 -勇氣的寶箱-',
  '文豪Stray Dogs 第4季',
  '間諜教室 第二季',
  '86 -不存在的戰區- 第二季',
  '魔法少女伊莉雅：Licht 無名的少女',
  '叫我對大哥',
  '無職轉生～到了異世界就拿出真本事～',
  '喬瑟與虎與魚群',
  '憂國的莫里亞蒂',
  'A3! 《秋冬篇》',
  'Fate/stay night [Heaven\'s Feel]：III. 春櫻之歌',
  '輝夜姬想讓人告白？～天才們的戀愛頭腦戰～',
  '輝夜姬想讓人告白～天才們的戀愛頭腦戰～',
  'A3!滿開劇團 春&夏',
  '鬼滅之刃',
  '鑽石王牌 actII',
  '約會大作戰 DATE A LIVE 第三季',
  'SSSS.GRIDMAN',
  'OVERLORD III',
  '遊戲3人娘',
  'MEGALOBOX',
  'OVERLORD II',
  '魔法少女☆伊莉雅 – 雪下的誓言',
  '愛麗絲與藏六',
  '聲之形',
  'Bananya 香蕉喵',
  'Love Live! 學園偶像電影',
  '斬！赤紅之瞳',
  '魔法少女☆伊莉雅 2wei !',
  '排球少年!!',
  'JOJO 的奇妙冒險 星塵遠徵軍',
  '魔法科高中的劣等生',
  '一週的朋友',
  '蟲師 續章',
  'Love Live!學園偶像計畫 二期',
  '銀河騎士傳',
  '遊戲王ARC-V',
  '偽戀',
  '未確認進行式',
  '魔法戰爭',
  '鬼燈的冷徹',
  'WIZARD BARRISTERS～弁魔士賽希爾',
  '境界的彼方',
  '蒼翼默示錄',
  '槍彈辯駁',
  '新科學小飛俠',
  '科學超電磁砲Ｓ',
  'Love Live!學園偶像計畫',
  'JoJo 的奇妙冒險',
  '女神異聞錄4',
  '荒川爆笑團',
  '影宅',
  '影宅 第二季'
];

const p4Items = reportData.results.filter(x => x.reasons[0] && x.reasons[0].includes('官方繁中譯名校正'));
p4Items.forEach(x => {
  const isExcluded = p4Exclude.some(e => x.titleZh.trim() === e.trim() || x.officialTitle.trim() === e.trim());
  if (!isExcluded) {
    setTitleZh(x.id, x.officialTitle);
    stats.p4Applied++;
  }
});
console.log(`  [P4] 成功優化 ${stats.p4Applied} 部動畫譯名，已鎖定為 manual 權威！`);

// ----------------------------------------------------
// Part 3: 第三部分中 幫我做指定修正 其餘不用修改 (最高優先權覆蓋)
// ----------------------------------------------------
console.log('\n--- 處理 Part 3: 指定移除與優化 ---');
// 1. 影宅 -> SHADOWS HOUSE-影宅, sn=22246
setTitleZh('anilist-125038', 'SHADOWS HOUSE-影宅');
setGamerLink('anilist-125038', 'https://ani.gamer.com.tw/animeVideo.php?sn=22246');
stats.p3Applied++;
console.log(`  [P3] 影宅 -> SHADOWS HOUSE-影宅 (sn=22246)`);

// 2. 影宅 第二季 -> SHADOWS HOUSE-影宅 第二季, sn=30286
setTitleZh('anilist-139093', 'SHADOWS HOUSE-影宅 第二季');
setGamerLink('anilist-139093', 'https://ani.gamer.com.tw/animeVideo.php?sn=30286');
stats.p3Applied++;
console.log(`  [P3] 影宅 第二季 -> SHADOWS HOUSE-影宅 第二季 (sn=30286)`);

// 3. 去除以下巴哈連結
const p3RemoveIDs = [
  'anilist-2963',  // 南家三姊妹 2007 秋
  'anilist-14511', // 南家三姊妹 我回來了
  'anilist-918',   // 銀魂
  'anilist-457',   // 蟲師
  'anilist-269',   // BLEACH 死神
  'anilist-101',   // AIR
  'anilist-93',    // 機動戰士鋼彈 Seed
  'anilist-6',     // 槍神 Trigun
  'anilist-232',   // 庫洛魔法使
  'anilist-527',   // 寶可夢-無印篇
  'anilist-45',    // 神劍闖江湖
  'anilist-967',   // 北斗神拳
  'anilist-80'     // 機動戰士高達
];
p3RemoveIDs.forEach(id => {
  const item = animeMap.get(id);
  if (item) {
    removeGamerLink(id);
    stats.p3Applied++;
    console.log(`  [P3 移除巴哈] ${item.titleZh} (${id})`);
  }
});

// ----------------------------------------------------
// Part 5: 額外幫我做處理 (最高優先權覆蓋)
// ----------------------------------------------------
console.log('\n--- 處理 Part 5: 額外精緻校正 ---');
const p5Tasks = [
  { id: 'anilist-163542', title: '間諜教室 後篇' },
  { id: 'anilist-131586', title: '86 -不存在的戰區- 後篇' },
  { id: 'anilist-107651', title: 'A3! 《春夏篇》' },
  { id: 'anilist-101921', title: '輝夜姬想讓人告白～天才們的戀愛頭腦戰～' },
  { id: 'anilist-112641', title: '輝夜姬想讓人告白～天才們的戀愛頭腦戰～ 第二季', url: 'https://ani.gamer.com.tw/animeVideo.php?sn=15298' },
  { id: 'anilist-100298', title: 'MEGALOBOX 機甲拳擊', url: 'https://ani.gamer.com.tw/animeVideo.php?sn=21796' },
  { id: 'anilist-113359', title: 'NOMAD MEGALOBOX 機甲拳擊 第二季' },
  { id: 'anilist-19111', title: 'Love Live!學園偶像計畫 第二季' }
];

p5Tasks.forEach(task => {
  if (task.title) {
    setTitleZh(task.id, task.title);
    console.log(`  [P5 譯名] ${task.id} -> ${task.title}`);
  }
  if (task.url) {
    setGamerLink(task.id, task.url);
    console.log(`  [P5 連結] ${task.id} -> ${task.url}`);
  }
  stats.p5Applied++;
});

// Write back all files
fs.writeFileSync(ANIME_DATA_PATH, JSON.stringify(animeData, null, 2), 'utf8');
fs.writeFileSync(OVERRIDE_PATH, JSON.parse(JSON.stringify(overrideData)) ? JSON.stringify(overrideData, null, 2) : '{}', 'utf8');
fs.writeFileSync(CACHE_PATH, JSON.stringify(cacheData, null, 2), 'utf8');

console.log('\n🌟 5 大命令全數成功執行完畢並寫入資料庫！');
console.log(`📊 統計報告:
  - Part 1 真正錯置修正: ${stats.p1Applied} 筆
  - Part 2 新增授權平台: ${stats.p2Applied} 筆 (排除 19 筆)
  - Part 3 指定優化與移除: ${stats.p3Applied} 筆
  - Part 4 官方譯名優化: ${stats.p4Applied} 筆 (排除 58+2 筆)
  - Part 5 額外精緻校正: ${stats.p5Applied} 筆
`);

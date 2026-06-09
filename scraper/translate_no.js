const fs = require('fs');
const overridePath = './public/custom_override.json';
const override = JSON.parse(fs.readFileSync(overridePath, 'utf8'));

const translations = {
  'anilist-201514': '才女的侍從 在滿是高嶺之花的名門學校暗中照顧（生活能力皆無的）學院第一大小姐',
  'anilist-208044': '落第賢者的學院無雙～第二次轉生的S級作弊魔術師冒險錄～',
  'anilist-199408': '被激怒的千金發誓報復。～用魔導書的力量將祖國徹底擊潰～',
  'anilist-130590': '魔王學院的不適任者～史上最強的魔王始祖，轉生就讀子孫們的學校～ 第二季 第2部分',
  'anilist-138700': '憂國的莫里亞蒂 OVA',
  'anilist-101432': '紫羅蘭永恆花園 Extra Episode: 一定會迎來明白「愛」的那一天吧',
  'anilist-98580': '小林家的龍女僕 第14話 情人節，然後是溫泉！（請不要太期待）',
  'anilist-21178': 'CODE GEASS 亡國的阿基德 最終章 致心愛的事物們',
  'anilist-21209': '新妹魔王的契約者 特典',
  'anilist-21091': 'Free! 男子游泳部 -Eternal Summer- 禁忌的All Hard！',
  'anilist-21129': '閃亂神樂 ESTIVAL VERSUS -滿是泳裝的前夜祭-',
  'anilist-20889': '中二病也想談戀愛！戀 再生之…邪王真眼默示錄',
  'anilist-20479': '我的腦內選項正在全力干擾學園戀愛喜劇 OVA',
  'anilist-20686': '科學超電磁砲S 重要的事都是在澡堂學到的',
  'anilist-16934': '中二病也想談戀愛！ 閃耀的…聖爆誕祭',
  'anilist-15609': '其中1個是妹妹！哥哥、妹妹、戀人',
  'anilist-11313': '小鎮有你 黃昏交會點',
  'anilist-10863': '命運石之門 橫行跋扈的波力歐馬尼亞',
  'anilist-10604': '緋彈的亞莉亞 武偵前來溫泉研修',
  'anilist-10716': '永遠之久遠 第5章 雙絕之來復',
  'anilist-8023': '科學超電磁砲 更多更加超電磁砲',
  'anilist-7065': '鋼之鍊金術師 FULLMETAL ALCHEMIST 盲目的鍊金術師',
  'anilist-7066': '鋼之鍊金術師 FULLMETAL ALCHEMIST 單純的人們',
  'anilist-6349': 'CODE GEASS 反叛的魯路修 R2 幻態的魯路修',
  'anilist-5853': '南家三姊妹 甜品別腹',
  'anilist-4789': 'ef - a tale of melodies. Recollections',
  'anilist-3286': '君吻 pure rouge',
  'anilist-3162': '神靈狩/GHOST HOUND',
  'anilist-3101': '現視研 2',
  'anilist-3091': '瀨戶的花嫁 OVA'
};

let count = 0;
for(const [id, zh] of Object.entries(translations)) {
  if(!override[id]) override[id] = {};
  override[id].titleZh = zh;
  count++;
}
fs.writeFileSync(overridePath, JSON.stringify(override, null, 2), 'utf8');
console.log(`Translated ${count} items missed by the 'no' exception.`);

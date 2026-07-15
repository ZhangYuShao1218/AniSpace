export const NSFW_GENRES = ['Hentai', 'Ecchi', 'Erotica', 'Boys Love', 'Girls Love', '耽美', '百合', '福利'];
export const ITEMS_PER_PAGE = 25;
export const LOCAL_STORAGE_KEY = 'anispace_watched';
export const PLAN_TO_WATCH_KEY = 'anispace_plan_to_watch';
export const CACHED_DATA_KEY = 'anispace_cached_data';
export const TITLE_CORRECTIONS_KEY = 'anispace_title_corrections';
export const USER_DATA_KEY = 'anime_userdata';
export const CUSTOM_ANIME_KEY = 'anispace_custom_anime';
export const LAST_SYNC_TIME_KEY = 'anispace_last_sync_time';

export const NORMALIZE_GENRE_MAP: Record<string, string> = {
  // English to Standard Traditional Chinese
  'Action': '動作',
  'Adventure': '冒險',
  'Comedy': '喜劇',
  'Drama': '劇情',
  'Fantasy': '奇幻',
  'Horror': '恐怖',
  'Mystery': '懸疑',
  'Suspense': '懸疑',
  'Romance': '愛情',
  'Sci-Fi': '科幻',
  'Slice of Life': '日常',
  'Sports': '運動',
  'Supernatural': '超自然',
  'Thriller': '驚悚',
  'Psychological': '心理',
  'Music': '音樂',
  'Mecha': '機甲',
  'Mahou Shoujo': '魔法少女',
  'Hentai': '福利',
  'Ecchi': '福利',
  'Erotica': '福利',
  'Isekai': '異世界',
  'Super Power': '超能力',
  'Boys Love': '耽美',
  'Girls Love': '百合',
  'Gourmet': '美食',
  'Award Winning': '獲獎',
  'Avant Garde': '前衛',
  'School': '校園',
  'Tragedy': '憂鬱',
  'Dark Fantasy': '憂鬱',
  'Villainess': '惡役千金',
  'Food': '美食',
  'Harem': '後宮',
  'Post-Apocalyptic': '末日',
  'Time Loop': '時空輪迴',
  'Time Manipulation': '時空輪迴',

  // Chinese synonyms to Standard Traditional Chinese
  '搞笑': '喜劇',
  '戀愛': '愛情',
  '競技': '運動',
  '紳士': '福利',
  '魔法': '奇幻',
  '學園': '校園',
  '惡役': '惡役千金',
  '胃痛': '憂鬱',
  '後宮番': '後宮',
  '廢土': '末日',
  '時空穿越': '時空輪迴',
  '輪迴': '時空輪迴'
};

export function normalizeGenre(genre: string): string {
  if (!genre) return '';
  const trimmed = genre.trim();
  return NORMALIZE_GENRE_MAP[trimmed] || trimmed;
}

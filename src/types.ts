export interface Anime {
  id: string;
  titleZh: string;
  titleEn?: string;
  titleJa?: string;
  coverImage: string;
  coverImageAniList?: string;
  yearSeason: string;
  genres: string[];
  show?: string | boolean;
}

export interface WatchedAnime extends Anime {
  userRating: number;
  userComment: string;
  watchedDate: string;
}

export type SortOption = 'date_desc' | 'date_asc' | 'rating_desc' | 'rating_asc';

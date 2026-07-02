export interface StreamingPlatform {
  site: string;
  name: string;
  region: string;
  url: string;
}

export interface Anime {
  id: string;
  titleZh: string;
  titleEn?: string;
  titleJa?: string;
  coverImage: string;
  coverImageAniList?: string;
  preferredCoverImage?: string;
  yearSeason: string;
  genres: string[];
  show?: string | boolean;
  streamings?: StreamingPlatform[];
  startDate?: { year?: number | null; month?: number | null; day?: number | null };
  endDate?: { year?: number | null; month?: number | null; day?: number | null };
  updatedAt?: number;
  status?: string;
}

export interface WatchedAnime extends Anime {
  userRating: number;
  userComment: string;
  watchedDate: string;
}

export type SortOption = 'date_desc' | 'date_asc' | 'rating_desc' | 'rating_asc';

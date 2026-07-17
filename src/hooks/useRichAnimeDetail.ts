import { useState, useEffect } from 'react';
import type { Anime } from '@/types';

export interface RichDetail {
  synopsis?: string;
  studio?: string;
  rating?: number | string;
  episodes?: number;
  loading?: boolean;
}

const MEMORY_CACHE: Record<string, RichDetail> = {};

// Try to load initial memory cache from localStorage if available
try {
  const saved = localStorage.getItem('anispace_detail_cache');
  if (saved) {
    Object.assign(MEMORY_CACHE, JSON.parse(saved));
  }
} catch (e) {
  console.warn('Could not load detail cache from localStorage', e);
}

const saveToLocalStorage = () => {
  try {
    localStorage.setItem('anispace_detail_cache', JSON.stringify(MEMORY_CACHE));
  } catch (e) {
    // ignore quota exceeded
  }
};

export function useRichAnimeDetail(anime?: Anime | null, enabled: boolean = true): RichDetail {
  const [detail, setDetail] = useState<RichDetail>(() => {
    if (!anime) return {};
    if (MEMORY_CACHE[anime.id]) {
      return MEMORY_CACHE[anime.id];
    }
    const hasProps = (anime as any).description || (anime as any).synopsis || (anime as any).studio;
    if (hasProps) {
      return {
        synopsis: (anime as any).description || (anime as any).synopsis || (anime as any).userComment,
        studio: (anime as any).studio,
        rating: (anime as any).rating || (anime as any).userRating || (anime as any)._seasonScore,
        loading: false
      };
    }
    return { loading: enabled };
  });

  useEffect(() => {
    if (!anime || !enabled) return;

    // Check memory cache
    if (MEMORY_CACHE[anime.id] && !MEMORY_CACHE[anime.id].loading) {
      setDetail(MEMORY_CACHE[anime.id]);
      return;
    }

    // Check props
    if ((anime as any).description && (anime as any).studio) {
      const existing: RichDetail = {
        synopsis: (anime as any).description,
        studio: (anime as any).studio,
        rating: (anime as any).rating || (anime as any).userRating || (anime as any)._seasonScore,
        loading: false
      };
      MEMORY_CACHE[anime.id] = existing;
      saveToLocalStorage();
      setDetail(existing);
      return;
    }

    let isMounted = true;
    setDetail(prev => ({ ...prev, loading: true }));

    const fetchDetail = async () => {
      try {
        const query = anime.titleJa || anime.titleZh;
        const res = await fetch(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(query)}&limit=1`);
        if (!res.ok) throw new Error('API fetch failed');
        const json = await res.json();
        const item = json.data?.[0];

        if (isMounted && item) {
          const rawSynopsis = item.synopsis || '';
          const cleanedSynopsis = rawSynopsis.replace(/\[Written by MAL Rewrite\]/i, '').trim();
          const fetched: RichDetail = {
            synopsis: cleanedSynopsis || ((anime as any).userComment ? `備忘記錄：${(anime as any).userComment}` : '暫無該作品詳細劇情簡介，請點擊下方官方正版平台前往觀看。'),
            studio: item.studios?.[0]?.name || '知名動畫工作室',
            rating: item.score || (anime as any).rating || (anime as any).userRating || (anime as any)._seasonScore || '推薦',
            episodes: item.episodes || undefined,
            loading: false
          };
          MEMORY_CACHE[anime.id] = fetched;
          saveToLocalStorage();
          setDetail(fetched);
        } else if (isMounted) {
          const fallback: RichDetail = {
            synopsis: (anime as any).userComment ? `備忘記錄：${(anime as any).userComment}` : '點擊下方官方正版平台播放連結，隨時開始追番或觀看最新集數。',
            studio: '官方授權播出',
            rating: (anime as any).rating || (anime as any).userRating || (anime as any)._seasonScore || '推薦',
            loading: false
          };
          MEMORY_CACHE[anime.id] = fallback;
          saveToLocalStorage();
          setDetail(fallback);
        }
      } catch (err) {
        if (isMounted) {
          const fallback: RichDetail = {
            synopsis: (anime as any).userComment ? `備忘記錄：${(anime as any).userComment}` : '點擊下方官方正版平台播放連結，隨時開始追番或觀看最新集數。',
            studio: '官方授權播出',
            rating: (anime as any).rating || (anime as any).userRating || (anime as any)._seasonScore || '推薦',
            loading: false
          };
          MEMORY_CACHE[anime.id] = fallback;
          saveToLocalStorage();
          setDetail(fallback);
        }
      }
    };

    fetchDetail();
    return () => { isMounted = false; };
  }, [anime?.id, enabled]);

  return detail;
}

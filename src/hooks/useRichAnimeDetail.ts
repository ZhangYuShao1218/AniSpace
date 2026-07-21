import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import type { Anime } from '@/types';

export interface RichDetail {
  synopsis?: string;
  studio?: string;
  rating?: number | string;
  episodes?: number;
  source?: string;
  trailerYoutubeId?: string;
  relatedAnimeIds?: number[];
  loading?: boolean;
}

const MEMORY_CACHE: Record<string, RichDetail> = {};

// Try to load initial memory cache from localStorage if available
try {
  const saved = localStorage.getItem('anispace_detail_cache_v3');
  if (saved) {
    const parsed = JSON.parse(saved);
    Object.keys(parsed).forEach(key => {
      const syn = parsed[key].synopsis;
      if (syn && (syn.includes('點擊下方官方正版平台播放連結') || syn.includes('暫無該作品詳細劇情簡介'))) {
        parsed[key].synopsis = '尚未收錄';
      }
    });
    Object.assign(MEMORY_CACHE, parsed);
  }
} catch (e) {
  console.warn('Could not load detail cache from localStorage', e);
}

const saveToLocalStorage = () => {
  try {
    localStorage.setItem('anispace_detail_cache_v3', JSON.stringify(MEMORY_CACHE));
  } catch (e) {
    // ignore quota exceeded
  }
};

export const clearRichDetailCache = () => {
  Object.keys(MEMORY_CACHE).forEach(key => delete MEMORY_CACHE[key]);
  localStorage.removeItem('anispace_detail_cache_v4');
  localStorage.removeItem('anispace_detail_cache_v3');
  localStorage.removeItem('anispace_detail_cache_v2');
};

export function useRichAnimeDetail(anime?: Anime | null, enabled: boolean = true): RichDetail {
  const { language, t } = useLanguage();
  
  const cacheKey = anime ? `${anime.id}_${language}` : '';

  const [detail, setDetail] = useState<RichDetail>(() => {
    if (!anime) return {};
    if (MEMORY_CACHE[cacheKey]) {
      return MEMORY_CACHE[cacheKey];
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
    if (MEMORY_CACHE[cacheKey] && !MEMORY_CACHE[cacheKey].loading) {
      setDetail(MEMORY_CACHE[cacheKey]);
      return;
    }

    let isMounted = true;
    setDetail(prev => ({ ...prev, loading: true }));

    const fetchDetail = async () => {
      try {
        // Step 1: Try fetching local metadata first
        const localRes = await fetch(`/anime_meta/${anime.id}.json`);
        if (localRes.ok) {
          const localJson = await localRes.json();
          if (isMounted) {
            let syn = '尚未收錄';
            if (language === 'en') {
              if (localJson.en) syn = localJson.en;
            } else if (language === 'ja') {
              if (localJson.ja) syn = localJson.ja;
            } else {
              if (localJson.zh) syn = localJson.zh;
              else if (localJson.bgmSummary) syn = localJson.bgmSummary;
            }
            if (syn === '尚未收錄' && (anime as any).userComment) {
              syn = `備忘記錄：${(anime as any).userComment}`;
            }
            if (syn === '尚未收錄' || syn.includes('點擊下方官方正版平台播放連結') || syn.includes('暫無該作品詳細劇情簡介')) {
              syn = t('modalNoSynopsis');
            }

            const fetched: RichDetail = {
              synopsis: syn,
              studio: localJson.studio || undefined,
              rating: localJson.averageScore || (anime as any).rating || (anime as any).userRating,
              episodes: localJson.episodes || undefined,
              source: localJson.source || undefined,
              trailerYoutubeId: localJson.trailerYoutubeId || undefined,
              relatedAnimeIds: localJson.relatedAnimeIds || undefined,
              loading: false
            };
            MEMORY_CACHE[cacheKey] = fetched;
            saveToLocalStorage();
            setDetail(fetched);
          }
          return; // Always exit early if localRes.ok is true, regardless of isMounted
        }
      } catch (err) {
        console.warn(`Local meta fetch failed for ${anime.id}`, err);
      }

      // Step 2: Fallback to Jikan API if local fetch failed or 404
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
            synopsis: cleanedSynopsis || ((anime as any).userComment ? `備忘記錄：${(anime as any).userComment}` : '尚未收錄'),
            studio: item.studios?.[0]?.name || undefined,
            rating: item.score || (anime as any).rating || (anime as any).userRating || (anime as any)._seasonScore || '推薦',
            episodes: item.episodes || undefined,
            source: item.source || undefined,
            trailerYoutubeId: item.trailer?.youtube_id || undefined,
            loading: false
          };
          MEMORY_CACHE[cacheKey] = fetched;
          saveToLocalStorage();
          setDetail(fetched);
        } else if (isMounted) {
          const fallback: RichDetail = {
            synopsis: (anime as any).userComment ? `備忘記錄：${(anime as any).userComment}` : t('modalNoSynopsis'),
            studio: '動畫工作室',
            loading: false
          };
          MEMORY_CACHE[cacheKey] = fallback;
          saveToLocalStorage();
          setDetail(fallback);
        }
      } catch (err) {
        if (isMounted) {
          const fallback: RichDetail = {
            synopsis: (anime as any).userComment ? `備忘記錄：${(anime as any).userComment}` : t('modalNoSynopsis'),
            studio: '動畫工作室',
            loading: false
          };
          MEMORY_CACHE[cacheKey] = fallback;
          saveToLocalStorage();
          setDetail(fallback);
        }
      }
    };

    fetchDetail();
    return () => { isMounted = false; };
  }, [anime?.id, enabled, language, t]);

  return detail;
}

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import type { Anime, WatchedAnime } from '@/types';
import { LOCAL_STORAGE_KEY, PLAN_TO_WATCH_KEY, CACHED_DATA_KEY, CUSTOM_ANIME_KEY, LAST_SYNC_TIME_KEY } from '@/utils/constants';

import { useTitleCorrections } from '@/hooks/useTitleCorrections';

const getDbUrl = () => {
  const source = import.meta.env.VITE_DATA_SOURCE;
  if (source === 'remote') return 'https://raw.githubusercontent.com/ZhangYuShao1218/AniSpace/main/public/anime_data.json';
  if (source === 'local') return '/anime_data.json';
  return import.meta.env.DEV 
    ? '/anime_data.json' 
    : 'https://raw.githubusercontent.com/ZhangYuShao1218/AniSpace/main/public/anime_data.json';
};
const REMOTE_DB_URL = getDbUrl();

const OVERRIDE_DB_URL = REMOTE_DB_URL.replace('anime_data.json', 'custom_override.json');

const fetchAndMergeAnimeData = async (): Promise<Anime[] | null> => {
  const timestamp = new Date().getTime();
  try {
    const [baseRes, overrideRes] = await Promise.all([
      fetch(`${REMOTE_DB_URL}?v=${timestamp}`),
      fetch(`${OVERRIDE_DB_URL}?v=${timestamp}`).catch(() => null)
    ]);
    
    let baseData: Anime[] = [];
    if (baseRes.ok) baseData = await baseRes.json();
    
    let overrideData: Record<string, Partial<Anime>> = {};
    if (overrideRes && overrideRes.ok) {
      try {
        overrideData = await overrideRes.json();
      } catch (e) { }
    }
    
    if (baseData && baseData.length > 0) {
      const mergedData = baseData.map((anime) => {
        const ov = overrideData[anime.id] || {};
        const merged = { ...anime, ...ov };
        const resolvedCover = ov.coverImage || anime.coverImageGamer || anime.coverImageAniList || anime.coverImage || '';
        
        const baseStreamings = ov.streamings || anime.streamings || [];
        const extraStreamings = (ov as any).extraStreamings || (ov as any).extraStreaming || [];
        let combinedStreamings = baseStreamings;
        if (extraStreamings.length > 0) {
          const streamMap = new Map<string, any>();
          baseStreamings.forEach((st) => streamMap.set(`${st.site}_${st.url}`, st));
          extraStreamings.forEach((st: any) => {
            const key = `${st.site}_${st.url}`;
            if (!streamMap.has(key)) {
              streamMap.set(key, st);
            }
          });
          combinedStreamings = Array.from(streamMap.values());
        }

        return {
          ...merged,
          streamings: combinedStreamings,
          coverImage: resolvedCover,
        };
      });
      // Filter out anime marked with show: false
      return mergedData.filter((anime) => anime.show !== false && anime.show !== "false");
    }
  } catch (err) {
    console.error('Failed to fetch anime data:', err);
  }
  return null;
};

interface AnimeContextType {
  allAnime: Anime[];
  customAnimeList: Anime[];
  watchedList: WatchedAnime[];
  planToWatchList: Anime[];
  isScraping: boolean;
  scrapeProgress: string;
  lastSyncTimeFormatted: string | null;
  handleSync: () => Promise<void>;
  handleAddCustomAnime: (anime: Anime) => void;
  handleImportCustomAnime: (importedData: Anime[]) => void;
  handleSaveReview: (watchedAnime: WatchedAnime) => void;
  handleRemoveReview: (animeId: string) => void;
  handlePlanToWatchToggle: (anime: Anime) => void;
  handleImport: (importedData: WatchedAnime[]) => void;
  handleImportPlan: (importedData: Anime[]) => void;
  // Correction & Userdata hook exports
  userData?: Record<string, { customTitle?: string; customCover?: string }>;
  corrections: Record<string, string>;
  setCorrection: (original: string, corrected: string, id?: string) => void;
  removeCorrection?: (original: string, id?: string) => void;
  setCustomCover?: (idOrTitle: string, coverUrl: string) => void;
  getCorrectedTitle: (original: string, id?: string) => string;
  getCustomCover?: (idOrTitle: string) => string | undefined;
  handleImportCorrections: (importedCorrections: Record<string, any>) => void;
  clearCorrections: () => void;
  handleClearRecords: () => void;
  handleClearAllData: () => void;
}

const AnimeContext = createContext<AnimeContextType | undefined>(undefined);

export const AnimeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [remoteAnime, setRemoteAnime] = useState<Anime[]>(() => {
    const cachedData = localStorage.getItem(CACHED_DATA_KEY);
    if (cachedData) {
      try {
        const parsed = JSON.parse(cachedData);
        if (Array.isArray(parsed)) {
          return parsed.map((item: any) => ({
            ...item,
            coverImage: item.coverImage || item.coverImageGamer || item.coverImageAniList || ''
          }));
        }
      } catch (e) { }
    }
    return [];
  });
  const [customAnimeList, setCustomAnimeList] = useState<Anime[]>(() => {
    const saved = localStorage.getItem(CUSTOM_ANIME_KEY);
    return saved ? JSON.parse(saved) : [];
  });
  const [watchedList, setWatchedList] = useState<WatchedAnime[]>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  });
  const [planToWatchList, setPlanToWatchList] = useState<Anime[]>(() => {
    const saved = localStorage.getItem(PLAN_TO_WATCH_KEY);
    return saved ? JSON.parse(saved) : [];
  });
  const [isScraping, setIsScraping] = useState<boolean>(false);
  const [scrapeProgress, setScrapeProgress] = useState<string>('');

  const [lastSyncTime, setLastSyncTime] = useState<number>(() => {
    const saved = localStorage.getItem(LAST_SYNC_TIME_KEY);
    return saved ? parseInt(saved, 10) : 0;
  });

  const lastSyncTimeFormatted = useMemo(() => {
    if (!lastSyncTime) return null;
    const now = new Date(lastSyncTime);
    return `${now.getFullYear()}/${now.getMonth() + 1}/${now.getDate()} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  }, [lastSyncTime]);

  const { userData, corrections, setCorrection, removeCorrection, setCustomCover, getCorrectedTitle, getCustomCover, handleImportCorrections, clearCorrections } = useTitleCorrections();

  const handleSync = useCallback(async () => {
    setIsScraping(true);
    setScrapeProgress('syncingRemoteDB');
    const startTime = Date.now();
    try {
      const nowMs = Date.now();
      localStorage.setItem(LAST_SYNC_TIME_KEY, nowMs.toString());
      setLastSyncTime(nowMs);
      const data = await fetchAndMergeAnimeData();
      const elapsed = Date.now() - startTime;
      if (elapsed < 800) await new Promise(r => setTimeout(r, 800 - elapsed));
      
      if (data && data.length > 0) {
        setRemoteAnime(data);
        localStorage.setItem(CACHED_DATA_KEY, JSON.stringify(data));
        setScrapeProgress('syncSuccess');
      } else {
        setScrapeProgress('syncFailedEmpty');
      }
    } catch (err) {
      console.error(err);
      setScrapeProgress('syncError');
    } finally {
      setTimeout(() => {
        setIsScraping(false);
        setScrapeProgress('');
      }, 2000);
    }
  }, []);

  useEffect(() => {
    let loadedData: Anime[] = [];
    const cachedData = localStorage.getItem(CACHED_DATA_KEY);
    if (cachedData) {
      try {
        const parsed = JSON.parse(cachedData);
        if (parsed.length > 0) {
          const resolved = parsed.map((item: any) => ({
            ...item,
            coverImage: item.coverImage || item.coverImageGamer || item.coverImageAniList || ''
          }));
          loadedData = resolved;
          setRemoteAnime(resolved);
        }
      } catch (e) { }
    }

    const lastSyncTimeStr = localStorage.getItem(LAST_SYNC_TIME_KEY);
    const lastSyncTime = lastSyncTimeStr ? parseInt(lastSyncTimeStr, 10) : 0;
    const oneDayInMs = 24 * 60 * 60 * 1000;
    const isOverOneDay = Date.now() - lastSyncTime > oneDayInMs;

    if (loadedData.length === 0 || isOverOneDay) {
      handleSync();
    }
  }, [handleSync]);

  useEffect(() => {
    // 輕量正規化儲存：使用者儲存空間只記錄動畫 ID 與評分、評論、日期及個人修改屬性
    const lightweightWatched = watchedList.map(w => ({
      id: w.id,
      userRating: w.userRating,
      userComment: w.userComment,
      watchedDate: w.watchedDate,
      ...((w as any).customTitle ? { customTitle: (w as any).customTitle } : {}),
      ...((w as any).customCover ? { customCover: (w as any).customCover } : {}),
    }));
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(lightweightWatched));
  }, [watchedList]);

  useEffect(() => {
    // 輕量正規化儲存：期待清單只保存動畫 ID 與個人客製設定
    const lightweightPlan = planToWatchList.map(p => ({
      id: p.id,
      ...((p as any).customTitle ? { customTitle: (p as any).customTitle } : {}),
      ...((p as any).customCover ? { customCover: (p as any).customCover } : {}),
    }));
    localStorage.setItem(PLAN_TO_WATCH_KEY, JSON.stringify(lightweightPlan));
  }, [planToWatchList]);

  useEffect(() => {
    localStorage.setItem(CUSTOM_ANIME_KEY, JSON.stringify(customAnimeList));
  }, [customAnimeList]);



  const handleAddCustomAnime = useCallback((anime: Anime) => {
    setCustomAnimeList(prev => [anime, ...prev]);
  }, []);

  const handleImportCustomAnime = useCallback((importedData: Anime[]) => {
    setCustomAnimeList(prev => {
      const newMap = new Map(importedData.map(i => [i.id, i]));
      prev.forEach(item => newMap.set(item.id, item));
      return Array.from(newMap.values());
    });
  }, []);

  const handleSaveReview = useCallback((watchedAnime: WatchedAnime) => {
    setWatchedList(prev => {
      const existingIdx = prev.findIndex(w => w.id === watchedAnime.id);
      if (existingIdx !== -1) {
        const newList = [...prev];
        newList[existingIdx] = watchedAnime;
        return newList;
      } else {
        return [watchedAnime, ...prev];
      }
    });
    setPlanToWatchList(prev => prev.filter(p => p.id !== watchedAnime.id));
  }, []);

  const handleRemoveReview = useCallback((animeId: string) => {
    setWatchedList(prev => prev.filter(w => w.id !== animeId));
  }, []);

  const handlePlanToWatchToggle = useCallback((anime: Anime) => {
    setPlanToWatchList(prev => {
      if (prev.some(p => p.id === anime.id)) {
        return prev.filter(p => p.id !== anime.id);
      } else {
        return [anime, ...prev];
      }
    });
  }, []);

  const handleImport = useCallback((importedData: WatchedAnime[]) => {
    setWatchedList(prev => {
      const newMap = new Map(importedData.map(i => [i.id, i]));
      prev.forEach(item => newMap.set(item.id, item));
      return Array.from(newMap.values());
    });
    const importedIds = new Set(importedData.map(i => i.id));
    setPlanToWatchList(prev => prev.filter(p => !importedIds.has(p.id)));
  }, []);

  const handleImportPlan = useCallback((importedData: Anime[]) => {
    setPlanToWatchList(prev => {
      const newMap = new Map(importedData.map(i => [i.id, i]));
      prev.forEach(item => newMap.set(item.id, item));
      return Array.from(newMap.values());
    });
  }, []);

  const handleClearRecords = useCallback(() => {
    setWatchedList([]);
    setPlanToWatchList([]);
  }, []);

  const handleClearAllData = useCallback(() => {
    setWatchedList([]);
    setPlanToWatchList([]);
    setCustomAnimeList([]);
    clearCorrections();
  }, [clearCorrections]);

  const remoteAnimeMap = useMemo(() => {
    const map = new Map<string, Anime>();
    remoteAnime.forEach(a => map.set(a.id, a));
    return map;
  }, [remoteAnime]);

  const mergeItemWithMaster = useCallback(<T extends Anime>(item: T): T => {
    const master = remoteAnimeMap.get(item.id);
    if (!master) return item;

    const customTitle = userData?.[item.id]?.customTitle || (item as any).customTitle;
    const customCover = userData?.[item.id]?.customCover || (item as any).customCover;

    return {
      ...master, // 1. 基礎動畫元資料（標題、封面、年份、分類、播放平台等）全數由主表 remoteAnimeMap 權威授權
      // 2. 嚴格提取並繼承使用者評價紀錄（完美兼容舊版全包資料與新版輕量資料格式）
      ...((item as any).userRating !== undefined ? { userRating: (item as any).userRating } : {}),
      ...((item as any).userComment !== undefined ? { userComment: (item as any).userComment } : {}),
      ...((item as any).watchedDate !== undefined ? { watchedDate: (item as any).watchedDate } : {}),
      // 3. 使用者最高優先：若使用者在 anime_userdata 表中設定了自訂名稱或封面，以此為第 1 順位呈現
      ...(customTitle ? { titleZh: customTitle, customTitle } : {}),
      ...(customCover ? { coverImage: customCover, customCover } : {}),
    } as unknown as T;
  }, [remoteAnimeMap, userData]);

  const enrichedCustomAnimeList = useMemo(() => customAnimeList.map(mergeItemWithMaster), [customAnimeList, mergeItemWithMaster]);
  const enrichedWatchedList = useMemo(() => watchedList.map(mergeItemWithMaster), [watchedList, mergeItemWithMaster]);
  const enrichedPlanToWatchList = useMemo(() => planToWatchList.map(mergeItemWithMaster), [planToWatchList, mergeItemWithMaster]);
  const enrichedAllAnime = useMemo(() => [...enrichedCustomAnimeList, ...remoteAnime], [enrichedCustomAnimeList, remoteAnime]);

  const contextValue = useMemo(() => ({
    allAnime: enrichedAllAnime,
    customAnimeList: enrichedCustomAnimeList,
    watchedList: enrichedWatchedList,
    planToWatchList: enrichedPlanToWatchList,
    isScraping,
    scrapeProgress,
    lastSyncTimeFormatted,
    handleSync,
    handleAddCustomAnime,
    handleImportCustomAnime,
    handleSaveReview,
    handleRemoveReview,
    handlePlanToWatchToggle,
    handleImport,
    handleImportPlan,
    userData,
    corrections,
    setCorrection,
    removeCorrection,
    setCustomCover,
    getCorrectedTitle,
    getCustomCover,
    handleImportCorrections,
    clearCorrections,
    handleClearRecords,
    handleClearAllData
  }), [
    enrichedAllAnime, enrichedCustomAnimeList, enrichedWatchedList, enrichedPlanToWatchList, isScraping, scrapeProgress, lastSyncTimeFormatted, userData, corrections,
    handleSync, handleAddCustomAnime, handleImportCustomAnime, handleSaveReview, handleRemoveReview,
    handlePlanToWatchToggle, handleImport, handleImportPlan, setCorrection, removeCorrection, setCustomCover, getCorrectedTitle, getCustomCover,
    handleImportCorrections, clearCorrections, handleClearRecords, handleClearAllData
  ]);

  return (
    <AnimeContext.Provider value={contextValue}>
      {children}
    </AnimeContext.Provider>
  );
};

export const useAnime = () => {
  const context = useContext(AnimeContext);
  if (context === undefined) {
    throw new Error('useAnime must be used within an AnimeProvider');
  }
  return context;
};

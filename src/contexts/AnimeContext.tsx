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
        if (overrideData[anime.id]) {
          return { ...anime, ...overrideData[anime.id] };
        }
        return anime;
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
  // Correction hook exports
  corrections: Record<string, string>;
  setCorrection: (original: string, corrected: string) => void;
  getCorrectedTitle: (original: string) => string;
  handleImportCorrections: (importedCorrections: Record<string, string>) => void;
  clearCorrections: () => void;
  handleClearRecords: () => void;
  handleClearAllData: () => void;
}

const AnimeContext = createContext<AnimeContextType | undefined>(undefined);

export const AnimeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [remoteAnime, setRemoteAnime] = useState<Anime[]>([]);
  const [customAnimeList, setCustomAnimeList] = useState<Anime[]>(() => {
    const saved = localStorage.getItem(CUSTOM_ANIME_KEY);
    return saved ? JSON.parse(saved) : [];
  });
  const allAnime = useMemo(() => [...customAnimeList, ...remoteAnime], [customAnimeList, remoteAnime]);
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

  const { corrections, setCorrection, getCorrectedTitle, handleImportCorrections, clearCorrections } = useTitleCorrections();

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
          loadedData = parsed;
          setRemoteAnime(parsed);
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
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(watchedList));
  }, [watchedList]);

  useEffect(() => {
    localStorage.setItem(PLAN_TO_WATCH_KEY, JSON.stringify(planToWatchList));
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

  const contextValue = useMemo(() => ({
    allAnime,
    customAnimeList,
    watchedList,
    planToWatchList,
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
    corrections,
    setCorrection,
    getCorrectedTitle,
    handleImportCorrections,
    clearCorrections,
    handleClearRecords,
    handleClearAllData
  }), [
    allAnime, customAnimeList, watchedList, planToWatchList, isScraping, scrapeProgress, lastSyncTimeFormatted, corrections,
    handleSync, handleAddCustomAnime, handleImportCustomAnime, handleSaveReview, handleRemoveReview,
    handlePlanToWatchToggle, handleImport, handleImportPlan, setCorrection, getCorrectedTitle,
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

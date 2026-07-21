import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import type { Anime, WatchedAnime } from '@/types';
import { LOCAL_STORAGE_KEY, PLAN_TO_WATCH_KEY, CACHED_DATA_KEY, CUSTOM_ANIME_KEY, LAST_SYNC_TIME_KEY, CACHED_DATA_VERSION_KEY, normalizeGenre } from '@/utils/constants';
import { cachedParseSeason } from '@/utils/season';
import { useTitleCorrections } from '@/hooks/useTitleCorrections';
import { clearRichDetailCache } from '@/hooks/useRichAnimeDetail';
import { getDbData, setDbData, migrateLocalStorageToIndexedDB } from '@/utils/indexedDB';

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
const DATA_VERSION_URL = REMOTE_DB_URL.replace('anime_data.json', 'data_version.json');

const fetchDataVersion = async (): Promise<number | null> => {
  const timestamp = new Date().getTime();
  try {
    const res = await fetch(`${DATA_VERSION_URL}?v=${timestamp}`);
    if (res.ok) {
      const json = await res.json();
      if (typeof json.version === 'number') {
        return json.version;
      }
    }
  } catch (e) { }
  return null;
};

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
        const ov: any = overrideData[anime.id] || {};
        const merged = { ...anime, ...ov };
        
        // 1. 翻譯優先序處理：先以 anime_data.json 為基底，檢查 custom_override 如果是 gamer/manual 直接呈現，若是 AI 則當 anime_data 翻譯為空才呈現 AI
        let resolvedTitleZh = anime.titleZh || "";
        if (ov.titleZh) {
          if (ov.source === 'gamer' || ov.source === 'manual') {
            resolvedTitleZh = ov.titleZh;
          } else if (ov.source === 'ai') {
            if (!anime.titleZh || anime.titleZh.trim() === "" || anime.titleZh === anime.titleJa) {
              resolvedTitleZh = ov.titleZh;
            }
          } else {
            // 相容未標註 source 的歷史手動覆蓋
            resolvedTitleZh = ov.titleZh;
          }
        }

        let resolvedTitleJa = anime.titleJa || "";
        if (ov.titleJa) {
          if (ov.source === 'gamer' || ov.source === 'manual') {
            resolvedTitleJa = ov.titleJa;
          } else if (ov.source === 'ai') {
            if (!anime.titleJa || anime.titleJa.trim() === "") {
              resolvedTitleJa = ov.titleJa;
            }
          } else {
            // 相容未標註 source 的歷史手動覆蓋
            resolvedTitleJa = ov.titleJa;
          }
        }

        const resolvedCover = ov.coverImage || anime.coverImageGamer || anime.coverImageAniList || anime.coverImage || '';
        
        const baseStreamings = ov.streamings || anime.streamings || [];
        const extraStreamings = (ov as any).extraStreamings || (ov as any).extraStreaming || [];
        let combinedStreamings = baseStreamings;
        if (extraStreamings.length > 0) {
          const streamMap = new Map<string, any>();
          baseStreamings.forEach((st: any) => {
            if (st && st.site) streamMap.set(st.site, st);
          });
          extraStreamings.forEach((st: any) => {
            if (st && st.site) {
              if (st.site === 'gamer' || st.site === 'gamer_hk') {
                streamMap.delete('gamer');
                streamMap.delete('gamer_hk');
              }
              streamMap.set(st.site, st);
            }
          });
          combinedStreamings = Array.from(streamMap.values());
        }

        const rawGenres = ov.genres || anime.genres || [];
        const normalizedGenres = Array.from(new Set((Array.isArray(rawGenres) ? rawGenres : []).map((g: any) => normalizeGenre(g)))).filter(Boolean).sort();
        const rawSeason = ov.yearSeason || anime.yearSeason || '未知';

        return {
          ...merged,
          titleZh: resolvedTitleZh,
          titleJa: resolvedTitleJa,
          streamings: combinedStreamings,
          coverImage: resolvedCover,
          genres: normalizedGenres,
          yearSeason: rawSeason,
          _seasonScore: cachedParseSeason(rawSeason),
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
  watchedMap: Map<string, WatchedAnime>;
  watchedIdsSet: Set<string>;
  planToWatchIdsSet: Set<string>;
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
  dataVersion: number | null;
  isInitializing: boolean;
}

const AnimeContext = createContext<AnimeContextType | undefined>(undefined);

export const AnimeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isInitializing, setIsInitializing] = useState<boolean>(true);
  const [dataVersion, setDataVersion] = useState<number | null>(null);
  const [remoteAnime, setRemoteAnime] = useState<Anime[]>([]);
  const [customAnimeList, setCustomAnimeList] = useState<Anime[]>([]);
  const [watchedList, setWatchedList] = useState<WatchedAnime[]>([]);
  const [planToWatchList, setPlanToWatchList] = useState<Anime[]>([]);
  const [isScraping, setIsScraping] = useState<boolean>(false);
  const [scrapeProgress, setScrapeProgress] = useState<string>('');
  const [lastSyncTime, setLastSyncTime] = useState<number>(0);

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
      localStorage.removeItem('anispace_detail_cache_v4');
      await setDbData(LAST_SYNC_TIME_KEY, nowMs.toString());
      clearRichDetailCache();
      setLastSyncTime(nowMs);
      const [data, vNum] = await Promise.all([
        fetchAndMergeAnimeData(),
        fetchDataVersion()
      ]);
      if (vNum !== null) {
        setDataVersion(vNum);
        await setDbData(CACHED_DATA_VERSION_KEY, vNum.toString());
      }
      const elapsed = Date.now() - startTime;
      if (elapsed < 800) await new Promise(r => setTimeout(r, 800 - elapsed));
      
      if (data && data.length > 0) {
        setRemoteAnime(data);
        await setDbData(CACHED_DATA_KEY, data);
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
    let mounted = true;
    const initDb = async () => {
      await migrateLocalStorageToIndexedDB();

      const dbWatched = await getDbData<WatchedAnime[]>(LOCAL_STORAGE_KEY) || [];
      const dbPlan = await getDbData<Anime[]>(PLAN_TO_WATCH_KEY) || [];
      const dbCustom = await getDbData<Anime[]>(CUSTOM_ANIME_KEY) || [];
      const dbRemote = await getDbData<Anime[]>(CACHED_DATA_KEY) || [];
      const dbVersionStr = await getDbData<string>(CACHED_DATA_VERSION_KEY);
      const dbVersion = dbVersionStr ? parseInt(dbVersionStr, 10) : null;
      const dbSyncTimeStr = await getDbData<string>(LAST_SYNC_TIME_KEY);
      const dbSyncTime = dbSyncTimeStr ? parseInt(dbSyncTimeStr, 10) : 0;

      if (!mounted) return;

      setWatchedList(dbWatched);
      setPlanToWatchList(dbPlan);
      setCustomAnimeList(dbCustom);

      let finalRemote = dbRemote;

      if (dbRemote.length > 0) {
        setRemoteAnime(finalRemote);
      }
      setDataVersion(dbVersion);
      setLastSyncTime(dbSyncTime);

      const oneDayInMs = 24 * 60 * 60 * 1000;
      const isOverOneDay = Date.now() - dbSyncTime > oneDayInMs;

      if (finalRemote.length === 0 || isOverOneDay) {
        await handleSync();
        setIsInitializing(false);
      } else {
        setIsInitializing(false);
        fetchDataVersion().then(async (vNum) => {
          if (vNum !== null && vNum !== dbVersion) {
            await handleSync();
          } else if (vNum !== null) {
            setDataVersion(vNum);
            await setDbData(CACHED_DATA_VERSION_KEY, vNum.toString());
          }
        });
      }
    };

    initDb();

    return () => { mounted = false; };
  }, [handleSync]);

  const watchedTimerRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    if (watchedTimerRef.current) clearTimeout(watchedTimerRef.current);
    watchedTimerRef.current = setTimeout(() => {
      if (isInitializing) return; // Prevent overwriting with initial empty array
      const lightweightWatched = watchedList.map(w => ({
        id: w.id,
        userRating: w.userRating,
        userComment: w.userComment,
        watchedDate: w.watchedDate,
        ...((w as any).customTitle ? { customTitle: (w as any).customTitle } : {}),
        ...((w as any).customCover ? { customCover: (w as any).customCover } : {}),
      }));
      setDbData(LOCAL_STORAGE_KEY, lightweightWatched);
    }, 300);
    return () => { if (watchedTimerRef.current) clearTimeout(watchedTimerRef.current); };
  }, [watchedList, isInitializing]);

  const planTimerRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    if (planTimerRef.current) clearTimeout(planTimerRef.current);
    planTimerRef.current = setTimeout(() => {
      if (isInitializing) return;
      const lightweightPlan = planToWatchList.map(p => ({
        id: p.id,
        ...((p as any).customTitle ? { customTitle: (p as any).customTitle } : {}),
        ...((p as any).customCover ? { customCover: (p as any).customCover } : {}),
      }));
      setDbData(PLAN_TO_WATCH_KEY, lightweightPlan);
    }, 300);
    return () => { if (planTimerRef.current) clearTimeout(planTimerRef.current); };
  }, [planToWatchList, isInitializing]);

  const customTimerRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    if (customTimerRef.current) clearTimeout(customTimerRef.current);
    customTimerRef.current = setTimeout(() => {
      if (isInitializing) return;
      setDbData(CUSTOM_ANIME_KEY, customAnimeList);
    }, 300);
    return () => { if (customTimerRef.current) clearTimeout(customTimerRef.current); };
  }, [customAnimeList, isInitializing]);



  const handleAddCustomAnime = useCallback((anime: Anime) => {
    const withScore = {
      ...anime,
      _seasonScore: anime._seasonScore !== undefined ? anime._seasonScore : cachedParseSeason(anime.yearSeason || '')
    };
    setCustomAnimeList(prev => [withScore, ...prev]);
  }, []);

  const handleImportCustomAnime = useCallback((importedData: Anime[]) => {
    setCustomAnimeList(prev => {
      const newMap = new Map<string, Anime>(importedData.map(i => [i.id, {
        ...i,
        _seasonScore: i._seasonScore !== undefined ? i._seasonScore : cachedParseSeason(i.yearSeason || '')
      }]));
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

  const allAnimeMap = useMemo(() => {
    const map = new Map<string, Anime>();
    remoteAnime.forEach(a => map.set(a.id, a));
    customAnimeList.forEach(a => map.set(a.id, a));
    return map;
  }, [remoteAnime, customAnimeList]);

  useEffect(() => {
    // 當主動畫庫與自訂清單皆完全載入完畢後，若某個動畫 ID 在兩處資料庫中皆找不到，直接從動畫紀錄或期待動畫刪除
    if (remoteAnime.length === 0 && customAnimeList.length === 0) return;

    setWatchedList(prev => {
      const filtered = prev.filter(item => allAnimeMap.has(item.id));
      return filtered.length !== prev.length ? filtered : prev;
    });

    setPlanToWatchList(prev => {
      const filtered = prev.filter(item => allAnimeMap.has(item.id));
      return filtered.length !== prev.length ? filtered : prev;
    });
  }, [remoteAnime.length, customAnimeList.length, allAnimeMap]);

  const mergeItemWithMaster = useCallback(<T extends Anime>(item: T): T => {
    const master = allAnimeMap.get(item.id);
    const customTitle = userData?.[item.id]?.customTitle || (item as any).customTitle || (master as any)?.customTitle;
    const customCover = userData?.[item.id]?.customCover || (item as any).customCover || (master as any)?.customCover;

    if (!master) {
      return {
        id: item.id || 'unknown',
        titleZh: customTitle || (item as any).titleZh || `未知作品 (${item.id || 'ID'})`,
        titleJa: (item as any).titleJa || '',
        titleEn: (item as any).titleEn || '',
        genres: Array.from(new Set((Array.isArray((item as any).genres) ? (item as any).genres : []).map((g: any) => normalizeGenre(g)))).filter(Boolean).sort(),
        yearSeason: (item as any).yearSeason || '未知',
        _seasonScore: (item as any)._seasonScore ?? cachedParseSeason((item as any).yearSeason || ''),
        coverImage: customCover || (item as any).coverImage || '',
        streamings: Array.isArray((item as any).streamings) ? (item as any).streamings : [],
        ...((item as any).userRating !== undefined ? { userRating: (item as any).userRating } : {}),
        ...((item as any).userComment !== undefined ? { userComment: (item as any).userComment } : {}),
        ...((item as any).watchedDate !== undefined ? { watchedDate: (item as any).watchedDate } : {}),
        ...(customTitle ? { customTitle } : {}),
        ...(customCover ? { customCover } : {}),
      } as unknown as T;
    }

    return {
      ...master, // 1. 基礎動畫元資料（標題、封面、年份、分類、播放平台等）全數由主表權威授權
      streamings: Array.isArray(master.streamings) ? master.streamings : [],
      // 2. 嚴格提取並繼承使用者評價紀錄（完美兼容舊版全包資料與新版輕量資料格式）
      ...((item as any).userRating !== undefined ? { userRating: (item as any).userRating } : {}),
      ...((item as any).userComment !== undefined ? { userComment: (item as any).userComment } : {}),
      ...((item as any).watchedDate !== undefined ? { watchedDate: (item as any).watchedDate } : {}),
      // 3. 使用者最高優先：若使用者在 anime_userdata 表中設定了自訂名稱或封面，以此為第 1 順位呈現
      ...(customTitle ? { titleZh: customTitle, customTitle } : {}),
      ...(customCover ? { coverImage: customCover, customCover } : {}),
    } as unknown as T;
  }, [allAnimeMap, userData]);

  const enrichedCustomAnimeList = useMemo(() => customAnimeList.map(mergeItemWithMaster), [customAnimeList, mergeItemWithMaster]);
  const enrichedWatchedList = useMemo(() => watchedList.filter(item => (remoteAnime.length === 0 && customAnimeList.length === 0) ? true : allAnimeMap.has(item.id)).map(mergeItemWithMaster), [watchedList, remoteAnime.length, customAnimeList.length, allAnimeMap, mergeItemWithMaster]);
  const enrichedPlanToWatchList = useMemo(() => planToWatchList.filter(item => (remoteAnime.length === 0 && customAnimeList.length === 0) ? true : allAnimeMap.has(item.id)).map(mergeItemWithMaster), [planToWatchList, remoteAnime.length, customAnimeList.length, allAnimeMap, mergeItemWithMaster]);
  const enrichedAllAnime = useMemo(() => [...enrichedCustomAnimeList, ...remoteAnime], [enrichedCustomAnimeList, remoteAnime]);

  const watchedMap = useMemo(() => new Map(enrichedWatchedList.map(w => [w.id, w])), [enrichedWatchedList]);
  const watchedIdsSet = useMemo(() => new Set(enrichedWatchedList.map(w => w.id)), [enrichedWatchedList]);
  const planToWatchIdsSet = useMemo(() => new Set(enrichedPlanToWatchList.map(p => p.id)), [enrichedPlanToWatchList]);

  const contextValue = useMemo(() => ({
    allAnime: enrichedAllAnime,
    customAnimeList: enrichedCustomAnimeList,
    watchedList: enrichedWatchedList,
    planToWatchList: enrichedPlanToWatchList,
    watchedMap,
    watchedIdsSet,
    planToWatchIdsSet,
    isScraping,
    scrapeProgress,
    isInitializing,
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
    handleClearAllData,
    dataVersion
  }), [
    enrichedAllAnime, enrichedCustomAnimeList, enrichedWatchedList, enrichedPlanToWatchList, watchedMap, watchedIdsSet, planToWatchIdsSet, isScraping, scrapeProgress, isInitializing, lastSyncTimeFormatted, userData, corrections, dataVersion,
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

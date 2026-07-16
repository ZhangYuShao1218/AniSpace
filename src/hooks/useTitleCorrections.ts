import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { USER_DATA_KEY } from '@/utils/constants';

export interface UserAnimeData {
  customTitle?: string;
  customCover?: string;
}

export type AnimeUserDataMap = Record<string, UserAnimeData>;
export type TitleCorrections = Record<string, string>; // 向後相容型別

export function useTitleCorrections() {
  const [userData, setUserData] = useState<AnimeUserDataMap>(() => {
    const saved = localStorage.getItem(USER_DATA_KEY);
    return saved ? JSON.parse(saved) : {};
  });

  const userDataRef = useRef(userData);
  useEffect(() => {
    userDataRef.current = userData;
  }, [userData]);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      localStorage.setItem(USER_DATA_KEY, JSON.stringify(userData));
    }, 300);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [userData]);

  // 設定或更新自訂名稱（優先使用動畫 ID 作為 key 儲存）
  const setCorrection = useCallback((original: string, corrected: string, id?: string) => {
    const targetKey = id || original;
    setUserData(prev => ({
      ...prev,
      [targetKey]: {
        ...(prev[targetKey] || {}),
        customTitle: corrected
      }
    }));
  }, []);

  // 設定或更新自訂封面 / URL
  const setCustomCover = useCallback((idOrTitle: string, coverUrl: string) => {
    setUserData(prev => ({
      ...prev,
      [idOrTitle]: {
        ...(prev[idOrTitle] || {}),
        customCover: coverUrl
      }
    }));
  }, []);

  // 取得自訂名稱：優先以 ID 查詢，次要以字串查詢
  const getCorrectedTitle = useCallback((original: string, id?: string) => {
    const map = userDataRef.current;
    if (id && map[id]?.customTitle) {
      return map[id].customTitle!;
    }
    if (map[original]?.customTitle) {
      return map[original].customTitle!;
    }
    return original;
  }, []);

  // 取得自訂封面 / URL
  const getCustomCover = useCallback((idOrTitle: string) => {
    return userDataRef.current[idOrTitle]?.customCover;
  }, []);

  const removeCorrection = useCallback((original: string, id?: string) => {
    setUserData(prev => {
      const next = { ...prev };
      if (id && next[id]) {
        const copy = { ...next[id] };
        delete copy.customTitle;
        if (Object.keys(copy).length === 0) delete next[id];
        else next[id] = copy;
      }
      if (next[original]) {
        const copy = { ...next[original] };
        delete copy.customTitle;
        if (Object.keys(copy).length === 0) delete next[original];
        else next[original] = copy;
      }
      return next;
    });
  }, []);

  const handleImportCorrections = useCallback((importedCorrections: Record<string, any>) => {
    setUserData(prev => {
      const merged = { ...prev };
      Object.entries(importedCorrections).forEach(([k, v]) => {
        if (typeof v === 'string') {
          merged[k] = { ...(merged[k] || {}), customTitle: v };
        } else if (typeof v === 'object' && v !== null) {
          merged[k] = { ...(merged[k] || {}), ...v };
        }
      });
      return merged;
    });
  }, []);

  const clearCorrections = useCallback(() => {
    setUserData({});
  }, []);

  // 為了向後相容將 corrections 轉為字串映射
  const corrections: Record<string, string> = useMemo(() => {
    const result: Record<string, string> = {};
    Object.entries(userData).forEach(([k, v]) => {
      if (v.customTitle) result[k] = v.customTitle;
    });
    return result;
  }, [userData]);

  return {
    userData,
    corrections,
    setCorrection,
    removeCorrection,
    setCustomCover,
    getCorrectedTitle,
    getCustomCover,
    handleImportCorrections,
    clearCorrections
  };
}

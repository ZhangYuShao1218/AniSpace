import { useState, useEffect } from 'react';
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

  useEffect(() => {
    localStorage.setItem(USER_DATA_KEY, JSON.stringify(userData));
  }, [userData]);

  // 設定或更新自訂名稱（優先使用動畫 ID 作為 key 儲存）
  const setCorrection = (original: string, corrected: string, id?: string) => {
    const targetKey = id || original;
    setUserData(prev => ({
      ...prev,
      [targetKey]: {
        ...(prev[targetKey] || {}),
        customTitle: corrected
      }
    }));
  };

  // 設定或更新自訂封面 / URL
  const setCustomCover = (idOrTitle: string, coverUrl: string) => {
    setUserData(prev => ({
      ...prev,
      [idOrTitle]: {
        ...(prev[idOrTitle] || {}),
        customCover: coverUrl
      }
    }));
  };

  // 取得自訂名稱：優先以 ID 查詢，次要以字串查詢
  const getCorrectedTitle = (original: string, id?: string) => {
    if (id && userData[id]?.customTitle) {
      return userData[id].customTitle!;
    }
    if (userData[original]?.customTitle) {
      return userData[original].customTitle!;
    }
    return original;
  };

  // 取得自訂封面 / URL
  const getCustomCover = (idOrTitle: string) => {
    return userData[idOrTitle]?.customCover;
  };

  const removeCorrection = (original: string, id?: string) => {
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
  };

  const handleImportCorrections = (importedCorrections: Record<string, any>) => {
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
  };

  const clearCorrections = () => {
    setUserData({});
  };

  // 為了向後相容將 corrections 轉為字串映射
  const corrections: Record<string, string> = {};
  Object.entries(userData).forEach(([k, v]) => {
    if (v.customTitle) corrections[k] = v.customTitle;
  });

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

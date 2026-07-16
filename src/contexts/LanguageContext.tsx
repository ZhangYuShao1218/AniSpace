import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import type { TranslationKey } from '../i18n/translations';
import { translations } from '../i18n/translations';

export type Language = 'zh-TW' | 'en' | 'ja';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationKey) => string;
  tTitle: (anime: { titleZh: string; titleEn?: string; titleJa?: string }) => string;
  tCover: (anime: { coverImage: string; coverImageAniList?: string }) => string;
  tGenre: (genre: string) => string;
  tYearSeason: (yearSeason: string) => string;
}

export const LanguageContext = createContext<LanguageContextType>({
  language: 'zh-TW',
  setLanguage: () => {},
  t: () => '',
  tTitle: () => '',
  tCover: () => '',
  tGenre: () => '',
  tYearSeason: () => ''
});

const genreCache = new Map<string, string>();

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('appLanguage');
    if (saved === 'zh-TW' || saved === 'en' || saved === 'ja') {
      return saved;
    }
    return 'zh-TW';
  });

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('appLanguage', lang);
  }, []);

  useEffect(() => {
    document.documentElement.lang = language === 'ja' ? 'ja' : language === 'en' ? 'en' : 'zh-TW';
  }, [language]);

  const t = useCallback((key: TranslationKey): string => {
    return translations[language][key] || translations['en'][key] || key;
  }, [language]);

  const tTitle = useCallback((anime: { titleZh: string; titleEn?: string; titleJa?: string }): string => {
    if (language === 'en' && anime.titleEn) return anime.titleEn;
    if (language === 'ja' && anime.titleJa) return anime.titleJa;
    return anime.titleZh;
  }, [language]);

  const tCover = useCallback((anime: { coverImage: string; coverImageAniList?: string }): string => {
    return language !== 'zh-TW' && anime.coverImageAniList ? anime.coverImageAniList : anime.coverImage;
  }, [language]);

  const tGenre = useCallback((rawGenre: string): string => {
    const genre = rawGenre.trim();
    const cacheKey = `${language}:${genre}`;
    const cached = genreCache.get(cacheKey);
    if (cached !== undefined) return cached;

    let key = `genre${genre.replace(/[\s-]/g, '')}` as TranslationKey;
    
    if (!translations['en'][key as TranslationKey]) {
      const foundKey = Object.keys(translations['en']).find(
        k => k.startsWith('genre') && (
          translations['zh-TW'][k as TranslationKey] === genre ||
          translations['en'][k as TranslationKey] === genre ||
          translations['ja'][k as TranslationKey] === genre
        )
      ) as TranslationKey | undefined;
      
      if (foundKey) {
        key = foundKey;
      }
    }

    const result = translations['en'][key as TranslationKey]
      ? (translations[language][key as TranslationKey] || genre)
      : genre;

    genreCache.set(cacheKey, result);
    return result;
  }, [language]);

  const tYearSeason = useCallback((yearSeason: string): string => {
    if (!yearSeason || !yearSeason.includes(' ')) return yearSeason;
    const [year, seasonStr] = yearSeason.split(' ');
    
    const seasonKey = ['Spring', 'Summer', 'Autumn', 'Winter', '春', '夏', '秋', '冬'].includes(seasonStr) 
      ? `season${seasonStr.replace(/春|Spring/, 'Spring').replace(/夏|Summer/, 'Summer').replace(/秋|Autumn|Fall/, 'Autumn').replace(/冬|Winter/, 'Winter')}` as TranslationKey
      : null;

    if (seasonKey && translations['en'][seasonKey]) {
      return `${year} ${translations[language][seasonKey]}`;
    }
    return yearSeason;
  }, [language]);

  const contextValue = useMemo(() => ({
    language, setLanguage, t, tTitle, tCover, tGenre, tYearSeason
  }), [language, setLanguage, t, tTitle, tCover, tGenre, tYearSeason]);

  return (
    <LanguageContext.Provider value={contextValue}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

import { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { SortOption } from '@/types';
import FilterBar from '@/components/layout/FilterBar';
import AnimeListLayout from '@/components/core/AnimeListLayout';
import { useAnime } from '@/contexts/AnimeContext';
import { NSFW_GENRES, normalizeGenre } from '@/utils/constants';
import { parseSeason, cachedParseSeason, getRelativeSeasonString } from '@/utils/season';
import { useUrlParams } from '@/hooks/useUrlParams';

const AllAnimePage = () => {
  const { allAnime } = useAnime();
  const [searchParams, setSearchParams] = useSearchParams();
  const [isReady, setIsReady] = useState(false);
  const hasRestoredRef = useRef(false);

  useEffect(() => {
    if (!hasRestoredRef.current) {
      hasRestoredRef.current = true;
      const savedSearch = sessionStorage.getItem('all_anime_page_last_search');
      if (window.location.search === '' && savedSearch && savedSearch !== '') {
        // 自行重組並設定完整 URL 查詢狀態（同時保留標籤與頁碼）
        setSearchParams(new URLSearchParams(savedSearch), { replace: true });
        return;
      }
    }
    setIsReady(true);
  }, [setSearchParams]);

  useEffect(() => {
    if (isReady) {
      const currentSearch = searchParams.toString();
      if (currentSearch) {
        sessionStorage.setItem('all_anime_page_last_search', `?${currentSearch}`);
      } else if (window.location.search === '') {
        sessionStorage.setItem('all_anime_page_last_search', '');
      }
    }
  }, [searchParams, isReady]);

  const updateFilterAndResetPage = useCallback((key: string, value: any, serialize?: (v: any) => string) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      const strVal = serialize ? serialize(value) : String(value);
      if (strVal === '' || (Array.isArray(value) && value.length === 0)) {
        next.delete(key);
      } else {
        next.set(key, strVal);
      }
      next.delete('page');
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  const [selectedYear] = useUrlParams<string>('year', '');
  const [selectedGenres] = useUrlParams<string[]>('genres', [], 
    (val) => val.join(','),
    (val) => val ? val.split(',').filter(Boolean) : []
  );
  const [searchQuery] = useUrlParams<string>('search', '');
  const [sortBy] = useUrlParams<SortOption>('sort', 'date_desc');
  const [currentPage, setCurrentPage] = useUrlParams<number>('page', 1);


  const availableYears = useMemo(() => {
    const years = new Set<string>();
    allAnime.forEach(a => {
      const yearMatch = a.yearSeason.match(/\d+/);
      if (yearMatch && parseInt(yearMatch[0], 10) <= 2009) {
        // Skip adding specific years 2009 and older because they will fall under the ~ 2009 category
      } else {
        years.add(a.yearSeason);
      }
    });
    return Array.from(years).sort((a, b) => parseSeason(b) - parseSeason(a));
  }, [allAnime]);

  const availableGenres = useMemo(() => {
    const genres = new Set<string>();
    allAnime.forEach(a => {
      (Array.isArray(a.genres) ? a.genres : []).forEach(g => {
        const norm = normalizeGenre(g);
        if (norm && !NSFW_GENRES.includes(norm)) genres.add(norm);
      });
    });
    return Array.from(genres).sort();
  }, [allAnime]);

  const filteredData = useMemo(() => {
    const nextSeason = getRelativeSeasonString(1);

    let result = allAnime.filter(anime => {
      // Hide next season anime by default UNLESS explicitly selected or searching
      if (selectedYear !== nextSeason && !searchQuery && anime.yearSeason === nextSeason) {
        return false;
      }

      let matchYear = true;
      if (selectedYear) {
        if (selectedYear === '~ 2009') {
          const yearMatch = (anime.yearSeason || '').match(/\d+/);
          matchYear = yearMatch ? parseInt(yearMatch[0], 10) <= 2009 : false;
        } else {
          matchYear = anime.yearSeason === selectedYear;
        }
      }
      const safeGenres = (Array.isArray(anime.genres) ? anime.genres : []).map(normalizeGenre);
      const matchGenre = selectedGenres.length === 0 ? true : selectedGenres.some(sg => {
        const normSg = normalizeGenre(sg);
        if (normSg === '福利') return safeGenres.includes('福利') || safeGenres.includes('Hentai') || safeGenres.includes('Ecchi') || safeGenres.includes('紳士');
        return safeGenres.includes(normSg);
      });
      const trimmedQuery = searchQuery.trim().toLowerCase();
      const matchSearch = trimmedQuery ? (
        (anime.titleZh || '').toLowerCase().includes(trimmedQuery) ||
        (anime.titleJa || '').toLowerCase().includes(trimmedQuery) ||
        (anime.titleEn || '').toLowerCase().includes(trimmedQuery)
      ) : true;
      return matchYear && matchGenre && matchSearch;
    });

    result = [...result].sort((a, b) => {
      const scoreA = a._seasonScore ?? cachedParseSeason(a.yearSeason || '');
      const scoreB = b._seasonScore ?? cachedParseSeason(b.yearSeason || '');
      if (sortBy === 'date_desc') return scoreB - scoreA;
      if (sortBy === 'date_asc') return scoreA - scoreB;
      return 0;
    });

    return result;
  }, [allAnime, selectedYear, selectedGenres, searchQuery, sortBy]);

  const topBarContent = (
    <FilterBar
      years={availableYears}
      genres={availableGenres}
      selectedYear={selectedYear}
      selectedGenres={selectedGenres}
      searchQuery={searchQuery}
      sortBy={sortBy}
      onYearChange={(y) => updateFilterAndResetPage('year', y)}
      onGenreChange={(g) => updateFilterAndResetPage('genres', g, (val: string[]) => val.join(','))}
      onSearchChange={(q) => updateFilterAndResetPage('search', q)}
      onSortChange={(s) => updateFilterAndResetPage('sort', s)}
    />
  );

  if (!isReady) {
    return <div className="layout-scroll-anchor" style={{ minHeight: '600px' }} />;
  }

  return (
    <AnimeListLayout
      title="所有動畫"
      totalCount={filteredData.length}
      filteredData={filteredData}
      topBarContent={topBarContent}
      emptyStateTitle="沒有找到符合的動畫"
      emptyStateMessage="請嘗試其他搜尋關鍵字或調整過濾條件。"
      shareData={[]} // No share logic heavily utilized here, just empty
      isWatchedShare={false}
      currentPage={currentPage}
      onPageChange={setCurrentPage}
    />
  );
};

export default AllAnimePage;

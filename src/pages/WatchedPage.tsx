import { useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { SortOption } from '@/types';
import AnimeListLayout from '@/components/core/AnimeListLayout';
import { useAnime } from '@/contexts/AnimeContext';
import SearchBar from '@/components/layout/SearchBar';
import { useUrlParams } from '@/hooks/useUrlParams';
import { useLanguage } from '@/contexts/LanguageContext';
import { cachedParseSeason } from '@/utils/season';

const WatchedPage = () => {
  const { watchedList } = useAnime();
  const [, setSearchParams] = useSearchParams();
  const [searchQuery] = useUrlParams<string>('search', '');
  const [sortBy] = useUrlParams<SortOption>('sort', 'date_desc');
  const { t } = useLanguage();

  const updateFilterAndResetPage = useCallback((type: 'search' | 'sort', value: string) => {
    setSearchParams(prev => {
      const newParams = new URLSearchParams(prev);
      if (type === 'search') {
        if (value.trim()) newParams.set('search', value.trim());
        else newParams.delete('search');
      }
      if (type === 'sort') {
        if (value !== 'date_desc') newParams.set('sort', value);
        else newParams.delete('sort');
      }
      newParams.set('page', '1');
      return newParams;
    });
  }, [setSearchParams]);

  const filteredData = useMemo(() => {
    let result = watchedList;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(anime => 
        (anime.titleZh && anime.titleZh.toLowerCase().includes(query)) ||
        (anime.titleJa && anime.titleJa.toLowerCase().includes(query)) ||
        (anime.titleEn && anime.titleEn.toLowerCase().includes(query)) ||
        ((anime as any).customTitle && (anime as any).customTitle.toLowerCase().includes(query)) ||
        (anime.userComment && anime.userComment.toLowerCase().includes(query))
      );
    }

    return result.sort((a, b) => {
      if (sortBy === 'rating_desc') return (b.userRating || 0) - (a.userRating || 0);
      if (sortBy === 'rating_asc') return (a.userRating || 0) - (b.userRating || 0);
      const scoreA = a._seasonScore ?? cachedParseSeason(a.yearSeason || '');
      const scoreB = b._seasonScore ?? cachedParseSeason(b.yearSeason || '');
      if (sortBy === 'date_desc') return scoreB - scoreA;
      if (sortBy === 'date_asc') return scoreA - scoreB;
      return 0;
    });
  }, [watchedList, searchQuery, sortBy]);

  const searchAndSort = (
    <>
      <SearchBar 
        placeholder={t('searchWatchedPlaceholder')} 
        value={searchQuery} 
        onChange={(q) => updateFilterAndResetPage('search', q)} 
        maxWidth="none"
      />
      <select 
        value={sortBy} 
        onChange={(e) => updateFilterAndResetPage('sort', e.target.value)}
        className="filter-select"
        style={{ minWidth: '160px' }}
      >
        <option value="date_desc">{t('sortYearDesc')}</option>
        <option value="date_asc">{t('sortYearAsc')}</option>
        <option value="rating_desc">{t('sortRatingDescHigh')}</option>
        <option value="rating_asc">{t('sortRatingAscLow')}</option>
      </select>
    </>
  );

  return (
    <AnimeListLayout
      title={t('navRecords')}
      totalCount={filteredData.length}
      filteredData={filteredData}
      headerRightContent={searchAndSort}
      emptyStateTitle={searchQuery ? t('emptySearchTitle') : t('emptyWatchedTitle')}
      emptyStateMessage={searchQuery ? t('emptySearchMsg') : t('emptyWatchedMsg')}
      isWatchedContext={true}
      shareData={watchedList}
      isWatchedShare={true}
      hideAffiliate={true}
    />
  );
};

export default WatchedPage;

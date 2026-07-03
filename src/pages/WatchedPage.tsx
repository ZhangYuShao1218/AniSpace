import { useMemo } from 'react';
import type { SortOption } from '@/types';
import AnimeListLayout from '@/components/core/AnimeListLayout';
import { useAnime } from '@/contexts/AnimeContext';
import SearchBar from '@/components/layout/SearchBar';
import { useUrlParams } from '@/hooks/useUrlParams';
import { useLanguage } from '@/contexts/LanguageContext';
import { parseSeason } from '@/utils/season';

const WatchedPage = () => {
  const { watchedList } = useAnime();
  const [searchQuery, setSearchQuery] = useUrlParams<string>('search', '');
  const [sortBy, setSortBy] = useUrlParams<SortOption>('sort', 'date_desc');
  const { t } = useLanguage();

  const filteredData = useMemo(() => {
    const trimmedQuery = searchQuery.trim().toLowerCase();
    let result = watchedList.filter(anime => 
      !trimmedQuery ||
      (anime.titleZh || '').toLowerCase().includes(trimmedQuery) ||
      (anime.titleJa || '').toLowerCase().includes(trimmedQuery) ||
      (anime.titleEn || '').toLowerCase().includes(trimmedQuery)
    );

    return result.sort((a, b) => {
      if (sortBy === 'rating_desc') return (b.userRating || 0) - (a.userRating || 0);
      if (sortBy === 'rating_asc') return (a.userRating || 0) - (b.userRating || 0);
      if (sortBy === 'date_desc') return parseSeason(b.yearSeason) - parseSeason(a.yearSeason);
      if (sortBy === 'date_asc') return parseSeason(a.yearSeason) - parseSeason(b.yearSeason);
      return 0;
    });
  }, [watchedList, searchQuery, sortBy]);

  const searchAndSort = (
    <>
      <SearchBar 
        placeholder={t('searchWatchedPlaceholder')} 
        value={searchQuery} 
        onChange={setSearchQuery} 
        maxWidth="none"
      />
      <select 
        value={sortBy} 
        onChange={(e) => setSortBy(e.target.value as SortOption)}
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

import { useMemo } from 'react';
import type { SortOption } from '../types';
import AnimeListLayout from '../components/AnimeListLayout';
import { useAnime } from '../contexts/AnimeContext';
import SearchBar from '../components/SearchBar';
import { useUrlParams } from '../hooks/useUrlParams';
import { useLanguage } from '../contexts/LanguageContext';

const WatchedPage = () => {
  const { watchedList } = useAnime();
  const [searchQuery, setSearchQuery] = useUrlParams<string>('search', '');
  const [sortBy, setSortBy] = useUrlParams<SortOption>('sort', 'date_desc');
  const { t } = useLanguage();

  const filteredData = useMemo(() => {
    let result = watchedList.filter(anime => 
      anime.titleZh.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return result.sort((a, b) => {
      if (sortBy === 'rating_desc') return (b.userRating || 0) - (a.userRating || 0);
      if (sortBy === 'rating_asc') return (a.userRating || 0) - (b.userRating || 0);
      return 0; // date_desc is handled naturally by insertion order mostly, or we assume it
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
    />
  );
};

export default WatchedPage;

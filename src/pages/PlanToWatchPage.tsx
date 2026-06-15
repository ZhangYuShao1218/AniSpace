import { useMemo } from 'react';
import type { SortOption } from '@/types';
import AnimeListLayout from '@/components/core/AnimeListLayout';
import { useAnime } from '@/contexts/AnimeContext';
import SearchBar from '@/components/layout/SearchBar';
import { useUrlParams } from '@/hooks/useUrlParams';
import { useLanguage } from '@/contexts/LanguageContext';
import { parseSeason } from '@/utils/season';

const PlanToWatchPage = () => {
  const { planToWatchList } = useAnime();
  const [searchQuery, setSearchQuery] = useUrlParams<string>('search', '');
  const [sortBy, setSortBy] = useUrlParams<SortOption>('sort', 'date_desc');
  const { t } = useLanguage();

  const filteredData = useMemo(() => {
    let result = planToWatchList.filter(anime => 
      anime.titleZh.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return result.sort((a, b) => {
      if (sortBy === 'date_desc') return parseSeason(b.yearSeason) - parseSeason(a.yearSeason);
      if (sortBy === 'date_asc') return parseSeason(a.yearSeason) - parseSeason(b.yearSeason);
      return 0;
    });
  }, [planToWatchList, searchQuery, sortBy]);

  const searchAndSort = (
    <>
      <SearchBar 
        placeholder={t('searchPlanPlaceholder')} 
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
      </select>
    </>
  );

  return (
    <AnimeListLayout
      title={t('navPlanToWatch')}
      totalCount={filteredData.length}
      filteredData={filteredData}
      headerRightContent={searchAndSort}
      emptyStateTitle={searchQuery ? t('emptySearchTitle') : t('emptyPlanTitle')}
      emptyStateMessage={searchQuery ? t('emptySearchMsg') : t('emptyPlanMsg')}
      shareData={planToWatchList}
      isWatchedShare={false}
      hideAffiliate={true}
    />
  );
};

export default PlanToWatchPage;

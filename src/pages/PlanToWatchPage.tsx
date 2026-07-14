import { useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { SortOption } from '@/types';
import AnimeListLayout from '@/components/core/AnimeListLayout';
import { useAnime } from '@/contexts/AnimeContext';
import SearchBar from '@/components/layout/SearchBar';
import { useUrlParams } from '@/hooks/useUrlParams';
import { useLanguage } from '@/contexts/LanguageContext';
import { parseSeason } from '@/utils/season';

const PlanToWatchPage = () => {
  const { planToWatchList } = useAnime();
  const [, setSearchParams] = useSearchParams();
  const [searchQuery] = useUrlParams<string>('search', '');
  const [sortBy] = useUrlParams<SortOption>('sort', 'date_desc');
  const { t } = useLanguage();

  const updateFilterAndResetPage = useCallback((key: string, value: any) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      const strVal = String(value);
      if (strVal === '') {
        next.delete(key);
      } else {
        next.set(key, strVal);
      }
      next.delete('page');
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  const filteredData = useMemo(() => {
    const trimmedQuery = searchQuery.trim().toLowerCase();
    let result = planToWatchList.filter(anime => 
      !trimmedQuery ||
      (anime.titleZh || '').toLowerCase().includes(trimmedQuery) ||
      (anime.titleJa || '').toLowerCase().includes(trimmedQuery) ||
      (anime.titleEn || '').toLowerCase().includes(trimmedQuery)
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

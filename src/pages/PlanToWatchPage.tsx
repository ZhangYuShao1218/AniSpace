import { useMemo } from 'react';
import AnimeListLayout from '../components/AnimeListLayout';
import { useAnime } from '../contexts/AnimeContext';
import SearchBar from '../components/SearchBar';
import { useUrlParams } from '../hooks/useUrlParams';
import { useLanguage } from '../contexts/LanguageContext';

const PlanToWatchPage = () => {
  const { planToWatchList } = useAnime();
  const [searchQuery, setSearchQuery] = useUrlParams<string>('search', '');
  const { t } = useLanguage();

  const filteredData = useMemo(() => {
    return planToWatchList.filter(anime => 
      anime.titleZh.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [planToWatchList, searchQuery]);

  const searchBox = (
    <SearchBar 
      placeholder={t('searchPlanPlaceholder')} 
      value={searchQuery} 
      onChange={setSearchQuery} 
    />
  );

  return (
    <AnimeListLayout
      title={t('navPlanToWatch')}
      totalCount={filteredData.length}
      filteredData={filteredData}
      headerRightContent={searchBox}
      emptyStateTitle={searchQuery ? t('emptySearchTitle') : t('emptyPlanTitle')}
      emptyStateMessage={searchQuery ? t('emptySearchMsg') : t('emptyPlanMsg')}
      shareData={planToWatchList}
      isWatchedShare={false}
    />
  );
};

export default PlanToWatchPage;

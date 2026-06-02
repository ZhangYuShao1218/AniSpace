import { useState, useMemo } from 'react';
import AnimeListLayout from '../components/AnimeListLayout';
import { useAnime } from '../contexts/AnimeContext';
import SearchBar from '../components/SearchBar';

const PlanToWatchPage = () => {
  const { planToWatchList } = useAnime();
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filteredData = useMemo(() => {
    return planToWatchList.filter(anime => 
      anime.titleZh.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [planToWatchList, searchQuery]);

  const searchBox = (
    <SearchBar 
      placeholder="搜尋期待清單..." 
      value={searchQuery} 
      onChange={setSearchQuery} 
    />
  );

  return (
    <AnimeListLayout
      title="期待動畫"
      totalCount={filteredData.length}
      filteredData={filteredData}
      headerRightContent={searchBox}
      emptyStateTitle={searchQuery ? "找不到符合的動畫" : "尚未添加任何期待動畫"}
      emptyStateMessage={searchQuery ? "請嘗試其他搜尋關鍵字。" : "在所有動畫中點擊 ❤️ 圖示，即可在此查看。"}
      shareData={planToWatchList}
      isWatchedShare={false}
    />
  );
};

export default PlanToWatchPage;

import { useMemo } from 'react';
import type { SortOption } from '../types';
import AnimeListLayout from '../components/AnimeListLayout';
import { useAnime } from '../contexts/AnimeContext';
import SearchBar from '../components/SearchBar';
import { useUrlParams } from '../hooks/useUrlParams';

const WatchedPage = () => {
  const { watchedList } = useAnime();
  const [searchQuery, setSearchQuery] = useUrlParams<string>('search', '');
  const [sortBy, setSortBy] = useUrlParams<SortOption>('sort', 'date_desc');

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
        placeholder="搜尋觀看紀錄..." 
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
        <option value="date_desc">首播年份 (新到舊)</option>
        <option value="rating_desc">評分 (最高)</option>
        <option value="rating_asc">評分 (最低)</option>
      </select>
    </>
  );

  return (
    <AnimeListLayout
      title="動畫紀錄"
      totalCount={filteredData.length}
      filteredData={filteredData}
      headerRightContent={searchAndSort}
      emptyStateTitle={searchQuery ? "找不到符合的動畫" : "尚未有任何觀看紀錄"}
      emptyStateMessage={searchQuery ? "請嘗試其他搜尋關鍵字。" : "在所有動畫中點擊「加入已看」按鈕，即可在此記錄。"}
      isWatchedContext={true}
      shareData={watchedList}
      isWatchedShare={true}
    />
  );
};

export default WatchedPage;

import { useState, useMemo } from 'react';
import AnimeListLayout from '../components/AnimeListLayout';
import { useAnime } from '../contexts/AnimeContext';
import { Search } from 'lucide-react';

const PlanToWatchPage = () => {
  const { planToWatchList } = useAnime();
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filteredData = useMemo(() => {
    return planToWatchList.filter(anime => 
      anime.titleZh.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [planToWatchList, searchQuery]);

  const searchBox = (
    <div className="search-box glass-panel" style={{ flex: '1', maxWidth: '400px', padding: '0', background: 'transparent', border: 'none' }}>
      <div style={{ position: 'relative' }}>
        <Search size={20} className="search-icon" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
        <input 
          type="text" 
          placeholder="搜尋期待清單..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="search-input"
          style={{ width: '100%', paddingLeft: '40px' }}
        />
      </div>
    </div>
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

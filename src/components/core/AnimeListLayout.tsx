import React, { useMemo, useEffect, useCallback } from 'react';
import type { Anime, WatchedAnime } from '@/types';
import AnimeCard from '@/components/core/AnimeCard';
import AdBanner from '@/components/layout/AdBanner';
import AffiliateCard from '@/components/core/AffiliateCard';
import Pagination from '@/components/layout/Pagination';
import ReviewModal from '@/components/modals/ReviewModal';
import { ShareModal } from '@/components/modals/ShareModal';
import { useAnime } from '@/contexts/AnimeContext';
import { ITEMS_PER_PAGE } from '@/utils/constants';
import { ThumbsUp, Loader2 } from 'lucide-react';
import { useUrlParams } from '@/hooks/useUrlParams';
import { useLanguage } from '@/contexts/LanguageContext';

interface AnimeListLayoutProps {
  title: string;
  totalCount: number;
  filteredData: (Anime | WatchedAnime)[];
  
  // For Search/Sort inputs in the header
  headerRightContent?: React.ReactNode;
  
  // For FilterBar (AllAnimePage)
  topBarContent?: React.ReactNode;
  
  // Empty state
  emptyStateTitle: string;
  emptyStateMessage: React.ReactNode;
  
  // Context & Share flags
  isWatchedContext?: boolean; 
  shareData: (Anime | WatchedAnime)[];
  isWatchedShare: boolean;
  hideAffiliate?: boolean;
}

const AnimeListLayout: React.FC<AnimeListLayoutProps> = ({
  title,
  totalCount,
  filteredData,
  headerRightContent,
  topBarContent,
  emptyStateTitle,
  emptyStateMessage,
  isWatchedContext = false,
  shareData,
  isWatchedShare,
  hideAffiliate = false
}) => {
  const { 
    watchedList, 
    planToWatchList,
    handleSaveReview, 
    handlePlanToWatchToggle,
    isScraping
  } = useAnime();
  const { t } = useLanguage();

  const isInitialMount = React.useRef(true);
  
  const [currentPage, setCurrentPage] = useUrlParams<number>('page', 1);
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = React.useState(false);
  const [selectedAnime, setSelectedAnime] = React.useState<Anime | WatchedAnime | null>(null);

  const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE);
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredData.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredData, currentPage]);

  const handleActionClick = useCallback((anime: Anime | WatchedAnime) => {
    const existingWatched = watchedList.find(w => w.id === anime.id);
    setSelectedAnime(existingWatched || anime);
    setIsModalOpen(true);
  }, [watchedList]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    
    const headerElement = document.querySelector('.layout-scroll-anchor') || document.querySelector('.page-header');
    if (headerElement) {
      const yOffset = 5;
      const y = headerElement.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const prevLengthRef = React.useRef(filteredData.length);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    
    // 當從遠端載入資料時（數量從 0 變為 N），不應重置頁碼，讓 sessionStorage 生效
    if (prevLengthRef.current === 0 && filteredData.length > 0) {
      prevLengthRef.current = filteredData.length;
      return;
    }

    // 若是因為使用者切換篩選條件導致數量改變，則將頁碼重置為 1
    if (prevLengthRef.current !== filteredData.length) {
      setCurrentPage(1);
      prevLengthRef.current = filteredData.length;
    }
  }, [filteredData.length, setCurrentPage]);

  return (
    <>
      {topBarContent && (
        <div className="layout-scroll-anchor">
          {topBarContent}
        </div>
      )}

      {/* Header section (only if title is provided, some pages might use FilterBar for title/header) */}
      {!topBarContent && (
        <div className="page-header layout-scroll-anchor" style={{ marginBottom: 'var(--spacing-6)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <h2 className="section-title" style={{ margin: 0 }}>{title} ({totalCount})</h2>
            <button 
              onClick={() => setIsShareModalOpen(true)}
              style={{ 
                padding: '8px 18px', 
                fontSize: '1rem', 
                display: 'inline-flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                lineHeight: '1.2',
                gap: '8px',
                background: 'linear-gradient(135deg, #10b981, #059669)',
                color: 'white',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)',
                cursor: 'pointer',
                fontWeight: 600,
                transition: 'all 0.2s'
              }}
              onMouseOver={e => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}
            >
              <ThumbsUp size={20} style={{ display: 'block', marginTop: '-2px' }} /> {t('recommendToOthers')}
            </button>
          </div>
          {headerRightContent && (
            <div style={{ display: 'flex', gap: '12px', flex: '1', maxWidth: '600px', alignItems: 'center' }}>
              {headerRightContent}
            </div>
          )}
        </div>
      )}

      {/* Empty State vs Grid */}
      {filteredData.length === 0 ? (
        <div className="empty-state glass-panel fade-in" id="main-content">
          <h2>{emptyStateTitle}</h2>
          <p>{emptyStateMessage}</p>
          {isScraping && (
            <p style={{ color: 'var(--accent-color)', marginTop: 'var(--spacing-4)' }}>
              <Loader2 className="animate-spin" size={24} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '8px' }} /> 
              正在努力抓取中，請不要關閉頁面...
            </p>
          )}
        </div>
      ) : (
        <div id="main-content">
          <AdBanner adSlot="3811211519" />
          
          <div className="anime-grid">
            {paginatedData.map((anime, index) => (
              <React.Fragment key={anime.id}>
                {/* 插入聯盟行銷原生廣告卡片 (第 11 格) */}
                {!hideAffiliate && index === 10 && <AffiliateCard />}
                
                <AnimeCard
                  anime={isWatchedContext ? anime : (watchedList.find(w => w.id === anime.id) || anime)}
                  isWatched={watchedList.some(w => w.id === anime.id)}
                  isPlanToWatch={planToWatchList.some(p => p.id === anime.id)}
                  onActionClick={handleActionClick}
                  onPlanToWatchToggle={handlePlanToWatchToggle}
                />
              </React.Fragment>
            ))}
          </div>

          <AdBanner adSlot="1547020579" />

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
          />
        </div>
      )}

      {/* Modals */}
      <ReviewModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        anime={selectedAnime}
        onSave={handleSaveReview}
      />

      {/* For AllAnimePage, the share button is in FilterBar, but we can still provide the modal here */}
      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        animes={shareData}
        isWatched={isWatchedShare}
      />
    </>
  );
};

export default AnimeListLayout;

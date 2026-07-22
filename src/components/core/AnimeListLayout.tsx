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
  currentPage?: number;
  onPageChange?: (page: number) => void;
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
  hideAffiliate = false,
  currentPage: currentPageProp,
  onPageChange: onPageChangeProp
}) => {
  const { 
    watchedMap,
    watchedIdsSet,
    planToWatchIdsSet,
    handleSaveReview,
    handleRemoveReview,
    handlePlanToWatchToggle,
    setCorrection,
    removeCorrection,
    getCorrectedTitle,
    isScraping
  } = useAnime();
  const { language, t } = useLanguage();
  
  const [internalPage, setInternalPage] = useUrlParams<number>('page', 1);
  const currentPage = currentPageProp !== undefined ? currentPageProp : internalPage;
  const setCurrentPage = onPageChangeProp !== undefined ? onPageChangeProp : setInternalPage;

  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = React.useState(false);
  const [selectedAnime, setSelectedAnime] = React.useState<Anime | WatchedAnime | null>(null);

  const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE);
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredData.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredData, currentPage]);

  const handleActionClick = useCallback((anime: Anime | WatchedAnime) => {
    const existingWatched = watchedMap.get(anime.id);
    setSelectedAnime(existingWatched || anime);
    setIsModalOpen(true);
  }, [watchedMap]);

  const handleEditTitle = useCallback((originalZh: string, newTitle: string, id: string) => {
    setCorrection(originalZh, newTitle, id);
  }, [setCorrection]);

  const handleResetTitle = useCallback((originalZh: string, id: string) => {
    if (removeCorrection) removeCorrection(originalZh, id);
  }, [removeCorrection]);

  const handleRemoveReviewClick = useCallback((id: string) => {
    handleRemoveReview(id);
  }, [handleRemoveReview]);

  const getDisplayTitle = useCallback((anime: Anime | WatchedAnime) => {
    let baseTitle = anime.titleZh;
    if (language === 'en' && anime.titleEn) baseTitle = anime.titleEn;
    else if (language === 'ja' && anime.titleJa) baseTitle = anime.titleJa;
    return getCorrectedTitle(baseTitle, anime.id);
  }, [language, getCorrectedTitle]);

  const handlePageChange = useCallback((page: number) => {
    if (page !== currentPage) {
      setCurrentPage(page);
    }

    requestAnimationFrame(() => {
      setTimeout(() => {
        const headerElement = document.querySelector('.layout-scroll-anchor') || document.querySelector('.page-header') || document.querySelector('#main-content');
        const targetY = headerElement ? Math.max(0, headerElement.getBoundingClientRect().top + window.pageYOffset + 5) : 0;
        
        const startY = window.pageYOffset;
        const distance = targetY - startY;
        const startTime = performance.now();
        const duration = 450; // 450ms for a natural smooth feel

        // easeOutCubic for a natural deceleration
        const easeOutCubic = (t: number, b: number, c: number, d: number) => {
          t /= d;
          t--;
          return c * (t * t * t + 1) + b;
        };

        const animation = (currentTime: number) => {
          const timeElapsed = currentTime - startTime;
          const nextY = easeOutCubic(timeElapsed, startY, distance, duration);
          window.scrollTo(0, nextY);
          
          if (timeElapsed < duration) {
            requestAnimationFrame(animation);
          } else {
            window.scrollTo(0, targetY);
          }
        };
        
        requestAnimationFrame(animation);
      }, 30);
    });
  }, [currentPage, setCurrentPage]);


  useEffect(() => {
    if (totalPages > 0 && currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage, setCurrentPage]);

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
                background: 'linear-gradient(135deg, #0d9488 0%, #10b981 45%, #059669 100%)',
                color: 'white',
                border: '1px solid rgba(110, 231, 183, 0.45)',
                borderRadius: 'var(--radius-md)',
                boxShadow: 'inset 0 1px 1px rgba(255, 255, 255, 0.45), 0 4px 15px rgba(13, 148, 136, 0.3)',
                textShadow: '0 1px 1px rgba(0, 0, 0, 0.25)',
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
                  anime={isWatchedContext ? anime : (watchedMap.get(anime.id) || anime)}
                  isWatched={watchedIdsSet.has(anime.id)}
                  isPlanToWatch={planToWatchIdsSet.has(anime.id)}
                  onActionClick={handleActionClick}
                  onPlanToWatchToggle={handlePlanToWatchToggle}
                  displayTitle={getDisplayTitle(anime)}
                  onEditTitle={handleEditTitle}
                  onResetTitle={handleResetTitle}
                  onRemoveReview={handleRemoveReviewClick}
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

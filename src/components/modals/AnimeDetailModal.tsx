import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { X, Star, Clock, Film, Play, Layers, Loader2, Heart, Check } from 'lucide-react';
import type { Anime } from '@/types';
import { useAnime } from '@/contexts/AnimeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useRichAnimeDetail } from '@/hooks/useRichAnimeDetail';
import ReviewModal from '@/components/modals/ReviewModal';
import { getPlatformIcon } from '@/components/core/PlatformIcon';
import './AnimeDetailModal.css';


const getSourceTranslation = (source: string, lang: string) => {
  if (!source) return '';
  const src = source.toLowerCase();
  if (lang === 'zh-TW') {
    if (src.includes('light novel')) return '輕小說';
    if (src.includes('visual novel')) return '視覺小說';
    if (src.includes('novel')) return '小說';
    if (src.includes('manga')) return '漫畫';
    if (src.includes('original')) return '原創';
    if (src.includes('game')) return '遊戲';
    if (src.includes('other')) return '其他';
  } else if (lang === 'ja') {
    if (src.includes('light novel')) return 'ライトノベル';
    if (src.includes('visual novel')) return 'ビジュアルノベル';
    if (src.includes('novel')) return '小説';
    if (src.includes('manga')) return '漫画';
    if (src.includes('original')) return 'オリジナル';
    if (src.includes('game')) return 'ゲーム';
    if (src.includes('other')) return 'その他';
  }
  return source;
};

export const AnimeDetailModal: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { allAnime, watchedMap, watchedIdsSet, planToWatchIdsSet, handleSaveReview, handlePlanToWatchToggle } = useAnime();
  const { language, t, tCover, tGenre, tYearSeason } = useLanguage();
  const [tooltip, setTooltip] = useState<string | null>(null);

  const handleBadgeClick = useCallback((e: React.MouseEvent, type: string) => {
    e.stopPropagation();
    setTooltip(prev => prev === type ? null : type);
  }, []);

  useEffect(() => {
    const handleClick = () => setTooltip(null);
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);

  useEffect(() => {
    // Determine if scrollbar is present to prevent layout shift
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    document.documentElement.style.setProperty('--scrollbar-width', `${scrollbarWidth}px`);
    document.body.classList.add('modal-open');
    return () => {
      document.body.classList.remove('modal-open');
    };
  }, []);

  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  
  // Scroll to top when anime changes
  const modalScrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (modalScrollRef.current) {
      modalScrollRef.current.scrollTop = 0;
    }
  }, [id]);
  
  // Drag to scroll logic
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [hasDragged, setHasDragged] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!scrollRef.current) return;
    setIsDragging(true);
    setHasDragged(false);
    setStartX(e.pageX - scrollRef.current.offsetLeft);
    setScrollLeft(scrollRef.current.scrollLeft);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !scrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollRef.current.offsetLeft;
    const walk = (x - startX) * 2;
    if (Math.abs(walk) > 10) {
      setHasDragged(true);
    }
    scrollRef.current.scrollLeft = scrollLeft - walk;
  };

  const anime = allAnime.find(a => String(a.id) === String(id) || `anilist-${a.id}` === id || a.titleZh === id);
  const richDetail = useRichAnimeDetail(anime, true);

  const displayTitle = anime ? (language === 'en' && anime.titleEn ? anime.titleEn :
                                language === 'ja' && anime.titleJa ? anime.titleJa :
                                anime.titleZh) : '';

  let displayRating = richDetail.rating;
  if (typeof displayRating === 'number') {
    displayRating = (displayRating / 10).toFixed(1);
  }

  const handleClose = useCallback(() => {
    const state = location.state as { backgroundLocation?: any };
    if (state?.backgroundLocation) {
      navigate(state.backgroundLocation.pathname + state.backgroundLocation.search);
    } else {
      navigate('/');
    }
  }, [navigate, location.state]);

  const relatedAnimeList = useMemo(() => {
    if (!richDetail.relatedAnimeIds) return [];
    return richDetail.relatedAnimeIds
      .map(rid => allAnime.find(a => String(a.id) === String(rid) || `anilist-${a.id}` === String(rid)))
      .filter((a): a is Anime => a !== undefined && String(a.id) !== String(anime?.id));
  }, [richDetail.relatedAnimeIds, allAnime, anime?.id]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isReviewModalOpen) {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleClose, isReviewModalOpen]);

  if (!anime) {
    return createPortal(
      <div className="anime-detail-modal-overlay" onClick={handleClose}>
        <div className="anime-detail-modal-card" onClick={e => e.stopPropagation()} style={{ textAlign: 'center', padding: '3rem' }}>
          <button className="anime-detail-modal-close" onClick={handleClose} title="關閉">
            <X size={20} />
          </button>
          <h2>找不到動畫資訊 / Anime Not Found</h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>該作品可能已變動或不在當前季度資料庫中。</p>
          <div style={{ marginTop: '1.5rem' }}>
            <button className="btn-modal-action primary" onClick={handleClose}>返回首頁</button>
          </div>
        </div>
      </div>,
      document.body
    );
  }

  const displayCover = tCover(anime);
  const isWatched = watchedIdsSet.has(anime.id);
  const isPlanToWatch = planToWatchIdsSet.has(anime.id);
  const safeGenres = Array.isArray(anime.genres) ? anime.genres : [];
  const safeStreamings = Array.isArray(anime.streamings) ? anime.streamings : [];

  // 格式化首播日期
  let displayTime = anime.yearSeason;
  if (displayTime && /^\d{5}$/.test(displayTime)) {
    const y = displayTime.substring(0, 4);
    const s = displayTime.substring(4, 5);
    const seasonMap: Record<string, string> = { '1': '春', '2': '夏', '3': '秋', '4': '冬' };
    displayTime = `${y} ${seasonMap[s] || s}`;
  }
  displayTime = tYearSeason(displayTime);

  if (anime.startDate && anime.startDate.year) {
    const y = anime.startDate.year;
    const m = anime.startDate.month ? String(anime.startDate.month).padStart(2, '0') : '';
    const d = anime.startDate.day ? String(anime.startDate.day).padStart(2, '0') : '';
    if (y && m && d) displayTime = `${y}-${m}-${d}`;
    else if (y && m) displayTime = `${y}/${m}`;
  }

  const content = (
    <div 
      className="anime-detail-modal-overlay" 
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          e.currentTarget.dataset.closeable = 'true';
        } else {
          e.currentTarget.dataset.closeable = 'false';
        }
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && e.currentTarget.dataset.closeable === 'true') {
          handleClose();
        }
      }}
    >
      <div className="anime-detail-modal-card" onClick={(e) => { e.stopPropagation(); setTooltip(null); }}>
        <button className="anime-detail-modal-close" onClick={handleClose} title="關閉視窗 (ESC)">
          <X size={20} />
        </button>

        <div className="modal-scroll-content" ref={modalScrollRef}>
          {/* Top Hero Section */}
          <div className="modal-top-hero">
            <div className="modal-cover-wrapper">
            <img src={displayCover} alt={anime.titleZh} className="modal-cover-img" referrerPolicy="no-referrer" />
          </div>

          <div className="modal-meta-info">
            {/* 標題 */}
            <h1 className={`modal-title-zh ${displayTitle.length > 50 ? 'ultra-long-title' : displayTitle.length > 35 ? 'extra-long-title' : displayTitle.length > 22 ? 'long-title' : ''}`}>
              <span className="title-text-clamp">{displayTitle}</span>
            </h1>

            {/* Badges */}
            <div className="modal-badges-row">
              {displayRating && (
                <span className="modal-badge">
                  <Star size={14} style={{ color: 'var(--accent-color)' }} />
                  {displayRating}
                </span>
              )}
              <span className="modal-badge">
                <Clock size={14} style={{ color: 'var(--accent-color)' }} />
                {displayTime}
              </span>
            </div>
            
            {(richDetail.studio || richDetail.source) && (
              <div className="modal-badges-row">
                {richDetail.studio && richDetail.studio !== '官方授權播出' && (
                  <span 
                    className="modal-badge clickable-badge"
                    onClick={(e) => handleBadgeClick(e, 'studio')}
                  >
                    <Film size={14} style={{ color: 'var(--accent-color)', flexShrink: 0 }} />
                    <span className="modal-badge-truncate">{richDetail.studio}</span>
                    {tooltip === 'studio' && (
                      <div className="badge-tooltip">{richDetail.studio}</div>
                    )}
                  </span>
                )}
                {richDetail.source && (
                  <span 
                    className="modal-badge clickable-badge"
                    onClick={(e) => handleBadgeClick(e, 'source')}
                  >
                    <Layers size={14} style={{ color: 'var(--accent-color)', flexShrink: 0 }} />
                    <span className="modal-badge-truncate">{getSourceTranslation(richDetail.source, language)}</span>
                    {tooltip === 'source' && (
                      <div className="badge-tooltip">{getSourceTranslation(richDetail.source, language)}</div>
                    )}
                  </span>
                )}
              </div>
            )}

            {/* Genres (Desktop) */}
            <div className="modal-genres-row desktop-only-genres">
              {safeGenres.map(g => (
                <span key={g} className="modal-genre-tag">{tGenre(g)}</span>
              ))}
            </div>

            {/* Circle Action Buttons */}
            <div className="modal-action-row">
              <button
                type="button"
                className={`circle-action-btn ${isWatched ? 'active' : ''}`}
                onClick={() => setIsReviewModalOpen(true)}
                title={isWatched ? '編輯動畫紀錄' : '加入動畫紀錄'}
              >
                <Check size={20} className={isWatched ? 'fill-current' : ''} />
              </button>

              <button
                type="button"
                className={`circle-action-btn ${isPlanToWatch ? 'active-pink' : ''}`}
                onClick={() => handlePlanToWatchToggle(anime)}
                title={isPlanToWatch ? '從期待動畫移除' : '加入期待動畫'}
              >
                <Heart size={20} className={isPlanToWatch ? 'fill-current' : ''} />
              </button>

              {richDetail.trailerYoutubeId && (
                <button 
                  type="button"
                  className="rect-action-btn youtube"
                  onClick={() => window.open(`https://www.youtube.com/watch?v=${richDetail.trailerYoutubeId}`, '_blank')}
                  title={t('trailer')}
                >
                  <Play size={18} />
                  <span>{t('trailer')}</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Genres (Mobile only, rendered below hero) */}
        <div className="modal-genres-row mobile-only-genres">
          {safeGenres.map(g => (
            <span key={g} className="modal-genre-tag">{tGenre(g)}</span>
          ))}
        </div>

        {/* Synopsis Section */}
        <div className="modal-section">
          <h3><Star size={18} style={{ color: 'var(--accent-color)' }} /> {t('synopsis')}</h3>
          <p className="modal-synopsis-text">
            {richDetail.loading ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-color)' }}>
                <Loader2 size={16} className="animate-spin" /> 正在為您加載最新官方與權威資料庫之劇情概要...
              </span>
            ) : (
              richDetail.synopsis || t('modalNoSynopsis')
            )}
          </p>
        </div>

        {/* Streaming Section */}
        {safeStreamings.length > 0 && (
          <div className="modal-section">
            <h3 style={{ marginBottom: '1rem' }}><Play size={18} style={{ color: 'var(--accent-color)' }} /> {t('modalPlatforms')}</h3>
            <div className="modal-streaming-grid">
              {safeStreamings.map((st, idx) => {
                return (
                  <a
                    key={`${st.site}-${idx}`}
                    href={st.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="modal-streaming-link"
                    title={st.name || st.site}
                  >
                    <div className="platform-icon-wrapper">
                      {getPlatformIcon(st.site, 32)}
                    </div>
                  </a>
                );
              })}
            </div>
          </div>
        )}

        {/* Related Anime Section */}
        {relatedAnimeList.length > 0 && (
          <div className="modal-section" style={{ marginTop: '0.5rem' }}>
            <h3 style={{ marginBottom: '1rem' }}><Film size={18} style={{ color: 'var(--accent-color)' }} /> {t('modalRelated')}</h3>
            <div 
              ref={scrollRef}
              className="related-anime-scroll-container" 
              style={{
                display: 'flex', gap: '0.8rem', overflowX: 'auto', paddingBottom: '1rem',
                cursor: isDragging ? 'grabbing' : 'grab'
              }}
              onMouseDown={handleMouseDown}
              onMouseLeave={handleMouseLeave}
              onMouseUp={handleMouseUp}
              onMouseMove={handleMouseMove}
            >
              {relatedAnimeList.map(ra => (
                <div 
                  key={ra.id} 
                  className="related-anime-card-mini"
                  style={{ flexShrink: 0 }}
                  onClick={(e) => {
                    if (hasDragged) {
                      e.preventDefault();
                      return;
                    }
                    navigate(`/anime/${encodeURIComponent(ra.id)}`, { state: location.state });
                  }}
                  title={language === 'en' && ra.titleEn ? ra.titleEn : (language === 'ja' && ra.titleJa ? ra.titleJa : ra.titleZh)}
                >
                  <div className="related-anime-image-container">
                    <img 
                      src={tCover(ra)} 
                      alt={ra.titleZh} 
                      className="related-anime-cover"
                      draggable={false}
                      onDragStart={(e) => e.preventDefault()}
                    />
                  </div>
                  <div className="related-anime-info">
                    <div className="related-anime-title">
                      {language === 'en' && ra.titleEn ? ra.titleEn : (language === 'ja' && ra.titleJa ? ra.titleJa : ra.titleZh)}
                    </div>
                    {ra.yearSeason && (
                      <div className="related-anime-season">{tYearSeason(ra.yearSeason)}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            </div>
          )}
        </div>
      </div>

      {/* 疊加在詳細視窗上的評分短評視窗 (ReviewModal 具有 z-index: 2000) */}
      <ReviewModal
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        anime={watchedMap.get(anime.id) || anime}
        onSave={handleSaveReview}
      />
    </div>
  );

  return createPortal(content, document.body);
};

export default AnimeDetailModal;

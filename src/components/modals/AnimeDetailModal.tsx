import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { X, Star, Clock, Film, Play, ExternalLink, Loader2, Heart, Check, Calendar } from 'lucide-react';
import { useAnime } from '@/contexts/AnimeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useRichAnimeDetail } from '@/hooks/useRichAnimeDetail';
import ReviewModal from '@/components/modals/ReviewModal';
import './AnimeDetailModal.css';

const FREE_SITES = new Set([
  'gamer', 'gamer_hk', 'muse_tw', 'muse_hk',
  'ani_one', 'ani_one_asia', 'tropics', 'youtube',
  'linetv', 'abema', 'bilibili_tw', 'bilibili_hk_mo_tw', 'bilibili'
]);

export const AnimeDetailModal: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { allAnime, watchedMap, watchedIdsSet, planToWatchIdsSet, handleSaveReview, handlePlanToWatchToggle } = useAnime();
  const { tCover, tGenre, tYearSeason } = useLanguage();

  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);

  const anime = allAnime.find(a => String(a.id) === String(id) || `anilist-${a.id}` === id || a.titleZh === id);
  const richDetail = useRichAnimeDetail(anime, true);

  const handleClose = useCallback(() => {
    const state = location.state as { backgroundLocation?: any };
    if (state?.backgroundLocation) {
      navigate(-1);
    } else {
      navigate('/');
    }
  }, [location.state, navigate]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isReviewModalOpen) {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
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
  const watchedData = watchedMap.get(anime.id);

  // 格式化首播日期
  let formattedStartDate = anime.yearSeason;
  if (anime.startDate && anime.startDate.year) {
    const y = anime.startDate.year;
    const m = anime.startDate.month ? String(anime.startDate.month).padStart(2, '0') : '';
    const d = anime.startDate.day ? String(anime.startDate.day).padStart(2, '0') : '';
    if (y && m && d) formattedStartDate = `${y}-${m}-${d} 首播`;
    else if (y && m) formattedStartDate = `${y}年${m}月 首播`;
  }

  const content = (
    <div className="anime-detail-modal-overlay" onClick={handleClose}>
      <div className="anime-detail-modal-card" onClick={e => e.stopPropagation()}>
        <button className="anime-detail-modal-close" onClick={handleClose} title="關閉視窗 (ESC)">
          <X size={20} />
        </button>

        {/* Top Hero Section */}
        <div className="modal-top-hero">
          <div className="modal-cover-wrapper">
            <img src={displayCover} alt={anime.titleZh} className="modal-cover-img" referrerPolicy="no-referrer" />
          </div>

          <div className="modal-meta-info">
            {/* 三語言標題 */}
            <h1 className="modal-title-zh">{anime.titleZh}</h1>
            
            <div className="modal-title-sub-row">
              {anime.titleJa && anime.titleJa !== anime.titleZh && (
                <div className="modal-title-sub-item">
                  <span className="modal-lang-badge">JA</span>
                  <span>{anime.titleJa}</span>
                </div>
              )}
              {anime.titleEn && anime.titleEn !== anime.titleZh && anime.titleEn !== anime.titleJa && (
                <div className="modal-title-sub-item">
                  <span className="modal-lang-badge">EN</span>
                  <span>{anime.titleEn}</span>
                </div>
              )}
            </div>

            {/* Badges */}
            <div className="modal-badges-row">
              <span className="modal-badge">
                <Clock size={14} style={{ color: 'var(--accent-color)' }} />
                {tYearSeason(anime.yearSeason)}
              </span>
              <span className="modal-badge">
                <Calendar size={14} style={{ color: 'var(--accent-color)' }} />
                {formattedStartDate}
              </span>
              {richDetail.studio && (
                <span className="modal-badge">
                  <Film size={14} style={{ color: 'var(--accent-color)' }} />
                  {richDetail.studio}
                </span>
              )}
              {richDetail.rating && (
                <span className="modal-badge rating">
                  <Star size={14} fill="#fbbf24" />
                  <span>{richDetail.rating}</span>
                </span>
              )}
            </div>

            {/* Genres */}
            <div className="modal-genres-row">
              {safeGenres.map(g => (
                <span key={g} className="modal-genre-tag">{tGenre(g)}</span>
              ))}
            </div>

            {/* 兩個入口按鈕之：詳細視窗內部加入已看按鈕 / 追番計劃按鈕 */}
            <div className="modal-action-row">
              <button
                type="button"
                className={`btn-modal-action ${isWatched ? 'watched' : 'primary'}`}
                onClick={() => setIsReviewModalOpen(true)}
              >
                {isWatched ? (
                  <>
                    <Star size={18} fill="#34d399" style={{ color: '#34d399' }} />
                    <span>查看 / 修改評價 {watchedData?.userRating ? `(★ ${watchedData.userRating})` : ''}</span>
                  </>
                ) : (
                  <>
                    <Check size={18} />
                    <span>加入已看短評</span>
                  </>
                )}
              </button>

              <button
                type="button"
                className={`btn-modal-action secondary ${isPlanToWatch ? 'active' : ''}`}
                onClick={() => handlePlanToWatchToggle(anime)}
              >
                <Heart size={18} className={isPlanToWatch ? 'heart-fill' : ''} />
                <span>{isPlanToWatch ? '已在觀看計劃' : '加入觀看計劃'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Synopsis Section */}
        <div className="modal-section">
          <h3><Star size={18} style={{ color: 'var(--accent-color)' }} /> 故事簡介 / Synopsis</h3>
          <p className="modal-synopsis-text">
            {richDetail.loading ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-color)' }}>
                <Loader2 size={16} className="animate-spin" /> 正在為您加載最新官方與權威資料庫之劇情概要...
              </span>
            ) : (
              richDetail.synopsis || '暫無該動畫的詳細劇情概要，請點擊下方正版授權平台直接前往觀看。'
            )}
          </p>
        </div>

        {/* Streaming Section */}
        <div className="modal-section">
          <h3><Film size={18} style={{ color: 'var(--accent-color)' }} /> 授權播放平台 ({safeStreamings.length})</h3>
          {safeStreamings.length === 0 ? (
            <p style={{ color: 'var(--text-muted)' }}>目前資料庫尚未收錄該作品的正版授權播放位址。</p>
          ) : (
            <div className="modal-streaming-grid">
              {safeStreamings.map((st, idx) => {
                const isFree = FREE_SITES.has(st.site);
                return (
                  <a
                    key={`${st.site}-${idx}`}
                    href={st.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="modal-streaming-link"
                  >
                    <Play size={16} style={{ color: 'var(--accent-color)', flexShrink: 0 }} />
                    <div style={{ flex: 1, overflow: 'hidden' }}>
                      <div style={{ fontSize: '0.95rem', fontWeight: 700, textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden' }}>
                        {st.name || st.site}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: isFree ? '#4ade80' : 'var(--text-muted)' }}>
                        {isFree ? '免費 / 首播' : '付費會員'}
                      </div>
                    </div>
                    <ExternalLink size={14} style={{ opacity: 0.6, flexShrink: 0 }} />
                  </a>
                );
              })}
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

import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Star, Clock, Film, ChevronLeft, ExternalLink, Loader2, Play, Heart, Check, Calendar } from 'lucide-react';
import { useAnime } from '@/contexts/AnimeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useRichAnimeDetail } from '@/hooks/useRichAnimeDetail';
import ReviewModal from '@/components/modals/ReviewModal';
import './AnimeDetailPage.css';

const FREE_SITES = new Set([
  'gamer', 'gamer_hk', 'muse_tw', 'muse_hk',
  'ani_one', 'ani_one_asia', 'tropics', 'youtube',
  'linetv', 'abema', 'bilibili_tw', 'bilibili_hk_mo_tw', 'bilibili'
]);

const AnimeDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { allAnime, watchedMap, watchedIdsSet, planToWatchIdsSet, handleSaveReview, handlePlanToWatchToggle } = useAnime();
  const { tCover, tGenre, tYearSeason, t } = useLanguage();

  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);

  const anime = allAnime.find(a => String(a.id) === String(id) || `anilist-${a.id}` === id || a.titleZh === id);
  const richDetail = useRichAnimeDetail(anime, true);

  if (!anime) {
    return (
      <div className="anime-detail-container fade-in" style={{ textAlign: 'center', padding: '4rem 1rem' }}>
        <div className="anime-detail-card glass-panel" style={{ alignItems: 'center' }}>
          <h2>找不到動畫資訊 / Anime Not Found</h2>
          <p style={{ color: 'var(--text-secondary)' }}>可能該作品已從當前季度篩選或資料庫中移除。</p>
          <Link to="/" className="btn-glass" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.5rem' }}>
            <ChevronLeft size={16} /> 返回動畫清單
          </Link>
        </div>
      </div>
    );
  }

  const displayCover = tCover(anime);
  const isWatched = watchedIdsSet.has(anime.id);
  const isPlanToWatch = planToWatchIdsSet.has(anime.id);
  const safeGenres = Array.isArray(anime.genres) ? anime.genres : [];
  const safeStreamings = Array.isArray(anime.streamings) ? anime.streamings : [];
  const watchedData = watchedMap.get(anime.id);

  let formattedStartDate = anime.yearSeason;
  if (anime.startDate && anime.startDate.year) {
    const y = anime.startDate.year;
    const m = anime.startDate.month ? String(anime.startDate.month).padStart(2, '0') : '';
    const d = anime.startDate.day ? String(anime.startDate.day).padStart(2, '0') : '';
    if (y && m && d) formattedStartDate = `${y}-${m}-${d} 首播`;
    else if (y && m) formattedStartDate = `${y}年${m}月 首播`;
  }

  return (
    <div className="anime-detail-container fade-in">
      <div style={{ marginBottom: '1rem' }}>
        <Link to="/" className="btn-glass" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', fontSize: '0.9rem' }}>
          <ChevronLeft size={16} /> {t('backToHome' as any) || '返回首頁'}
        </Link>
      </div>

      <div className="anime-detail-card glass-panel">
        <div className="detail-top-hero">
          <div className="detail-cover-wrapper">
            <img src={displayCover} alt={anime.titleZh} className="detail-cover-img" referrerPolicy="no-referrer" />
          </div>

          <div className="detail-meta-info">
            <h1 className="detail-title">{anime.titleZh}</h1>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginTop: '-0.2rem' }}>
              {anime.titleJa && anime.titleJa !== anime.titleZh && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '1rem', color: 'var(--text-secondary)' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '0.15rem 0.45rem', borderRadius: '4px', background: 'var(--bg-glass)', border: '1px solid var(--border-glass)', color: 'var(--accent-color)' }}>JA</span>
                  <span>{anime.titleJa}</span>
                </div>
              )}
              {anime.titleEn && anime.titleEn !== anime.titleZh && anime.titleEn !== anime.titleJa && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '1rem', color: 'var(--text-secondary)' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '0.15rem 0.45rem', borderRadius: '4px', background: 'var(--bg-glass)', border: '1px solid var(--border-glass)', color: 'var(--accent-color)' }}>EN</span>
                  <span>{anime.titleEn}</span>
                </div>
              )}
            </div>

            <div className="detail-badges-row" style={{ marginTop: '0.5rem' }}>
              <span className="detail-badge">
                <Clock size={14} style={{ color: 'var(--accent-color)' }} />
                {tYearSeason(anime.yearSeason)}
              </span>
              <span className="detail-badge">
                <Calendar size={14} style={{ color: 'var(--accent-color)' }} />
                {formattedStartDate}
              </span>
              {richDetail.studio && (
                <span className="detail-badge">
                  <Film size={14} style={{ color: 'var(--accent-color)' }} />
                  {richDetail.studio}
                </span>
              )}
              {richDetail.rating && (
                <span className="detail-badge rating">
                  <Star size={14} fill="#fbbf24" />
                  <span>{richDetail.rating}</span>
                </span>
              )}
            </div>

            <div className="detail-genres-row">
              {safeGenres.map(g => (
                <span key={g} className="genre-tag">{tGenre(g)}</span>
              ))}
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', marginTop: '0.85rem' }}>
              <button
                type="button"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '0.65rem', padding: '0.8rem 1.6rem',
                  borderRadius: 'var(--radius-lg)', fontSize: '1rem', fontWeight: 700, cursor: 'pointer',
                  background: isWatched ? 'rgba(16, 185, 129, 0.2)' : 'var(--accent-gradient)',
                  color: isWatched ? '#34d399' : '#ffffff',
                  border: isWatched ? '1px solid rgba(16, 185, 129, 0.5)' : '1px solid rgba(255, 255, 255, 0.3)',
                  boxShadow: '0 4px 18px rgba(0, 0, 0, 0.3)', transition: 'all 0.2s'
                }}
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
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '0.65rem', padding: '0.8rem 1.6rem',
                  borderRadius: 'var(--radius-lg)', fontSize: '1rem', fontWeight: 700, cursor: 'pointer',
                  background: isPlanToWatch ? 'rgba(236, 72, 153, 0.2)' : 'var(--bg-glass)',
                  color: isPlanToWatch ? '#f472b6' : 'var(--text-primary)',
                  border: isPlanToWatch ? '1px solid rgba(236, 72, 153, 0.6)' : '1px solid var(--border-glass-light)',
                  transition: 'all 0.2s'
                }}
                onClick={() => handlePlanToWatchToggle(anime)}
              >
                <Heart size={18} className={isPlanToWatch ? 'heart-fill' : ''} />
                <span>{isPlanToWatch ? '已在觀看計劃' : '加入觀看計劃'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Synopsis Section */}
        <div className="detail-synopsis-section">
          <h3><Star size={18} style={{ color: 'var(--accent-color)' }} /> 劇情簡介 / Story Synopsis</h3>
          <p className="detail-synopsis-text">
            {richDetail.loading ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-color)' }}>
                <Loader2 size={16} className="animate-spin" /> 正在讀取權威動畫資料庫之劇情概要與最新製作團隊資訊...
              </span>
            ) : (
              richDetail.synopsis || '暫無該動畫的詳細劇情概要，請點擊下方官方授權平台直接前往觀看。'
            )}
          </p>
        </div>

        {/* Official Streaming Links */}
        <div className="detail-streaming-section">
          <h3><Film size={18} style={{ color: 'var(--accent-color)' }} /> 官方正版授權線上看 ({safeStreamings.length})</h3>
          {safeStreamings.length === 0 ? (
            <p style={{ color: 'var(--text-muted)' }}>目前資料庫尚未收錄該作品的正版授權播放位址。</p>
          ) : (
            <div className="detail-streaming-grid">
              {safeStreamings.map((st, idx) => {
                const isFree = FREE_SITES.has(st.site);
                return (
                  <a
                    key={`${st.site}-${idx}`}
                    href={st.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="detail-streaming-link"
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

      <ReviewModal
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        anime={watchedMap.get(anime.id) || anime}
        onSave={handleSaveReview}
      />
    </div>
  );
};

export default AnimeDetailPage;


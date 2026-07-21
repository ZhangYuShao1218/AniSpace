import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Star, Clock, Film, ChevronLeft, ExternalLink, Loader2, Play, Heart, Check, Calendar, BookOpen, Bookmark, PlayCircle } from 'lucide-react';
import { useAnime } from '@/contexts/AnimeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useRichAnimeDetail } from '@/hooks/useRichAnimeDetail';
import ReviewModal from '@/components/modals/ReviewModal';
import { getPlatformIcon } from '@/components/core/PlatformIcon';
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
    if (y && m && d) displayTime = `${y}-${m}-${d} 首播`;
    else if (y && m) displayTime = `${y}年${m}月 首播`;
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
                {displayTime}
              </span>
              {richDetail.studio && richDetail.studio !== '官方授權播出' && (
                <span className="detail-badge">
                  <Film size={14} style={{ color: 'var(--accent-color)' }} />
                  {richDetail.studio}
                </span>
              )}
              {richDetail.source && (
                <span className="detail-badge">
                  <BookOpen size={14} style={{ color: 'var(--accent-color)' }} />
                  {richDetail.source}
                </span>
              )}
            </div>

            <div className="detail-genres-row">
              {safeGenres.map(g => (
                <span key={g} className="genre-tag">{tGenre(g)}</span>
              ))}
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.8rem', alignItems: 'center', marginTop: '0.85rem' }}>
              <button
                type="button"
                className={`circle-action-btn ${isWatched ? 'active' : ''}`}
                onClick={() => setIsReviewModalOpen(true)}
                title={isWatched ? '查看/修改短評' : '加入已看短評'}
              >
                <Bookmark size={20} className={isWatched ? 'fill-current' : ''} />
              </button>

              <button
                type="button"
                className={`circle-action-btn ${isPlanToWatch ? 'active-pink' : ''}`}
                onClick={() => handlePlanToWatchToggle(anime)}
                title={isPlanToWatch ? '已在觀看計劃' : '加入觀看計劃'}
              >
                <Heart size={20} className={isPlanToWatch ? 'fill-current' : ''} />
              </button>

              {richDetail.trailerYoutubeId && (
                <button
                  type="button"
                  className="circle-action-btn youtube"
                  onClick={() => window.open(`https://www.youtube.com/watch?v=${richDetail.trailerYoutubeId}`, '_blank')}
                  title="觀看 PV / 預告"
                >
                  <PlayCircle size={20} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Synopsis Section */}
        <div className="detail-synopsis-section">
          <h3><Star size={18} style={{ color: 'var(--accent-color)' }} /> 故事簡介</h3>
          <p className="detail-synopsis-text">
            {richDetail.loading ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-color)' }}>
                <Loader2 size={16} className="animate-spin" /> 正在讀取權威動畫資料庫之劇情概要與最新製作團隊資訊...
              </span>
            ) : (
              richDetail.synopsis || '尚未收錄'
            )}
          </p>
        </div>

        {/* Official Streaming Links */}
        {safeStreamings.length > 0 && (
          <div className="detail-streaming-section">
            <h3 style={{ marginBottom: '1rem' }}><Film size={18} style={{ color: 'var(--accent-color)' }} /> 官方授權平台</h3>
            <div className="detail-streaming-grid">
              {safeStreamings.map((st, idx) => {
                return (
                  <a
                    key={`${st.site}-${idx}`}
                    href={st.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="detail-streaming-link"
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


import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { Star, Clock, Film, ChevronLeft, ExternalLink, Loader2, Play } from 'lucide-react';
import { useAnime } from '@/contexts/AnimeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useRichAnimeDetail } from '@/hooks/useRichAnimeDetail';
import './AnimeDetailPage.css';

const FREE_SITES = new Set([
  'gamer', 'gamer_hk', 'muse_tw', 'muse_hk',
  'ani_one', 'ani_one_asia', 'tropics', 'youtube',
  'linetv', 'abema', 'bilibili_tw', 'bilibili_hk_mo_tw', 'bilibili'
]);

const AnimeDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { allAnime } = useAnime();
  const { language, tCover, tGenre, tYearSeason, t } = useLanguage();

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

  let displayTitle = anime.titleZh;
  if (language === 'en' && anime.titleEn) displayTitle = anime.titleEn;
  else if (language === 'ja' && anime.titleJa) displayTitle = anime.titleJa;

  const displayCover = tCover(anime);
  const safeGenres = Array.isArray(anime.genres) ? anime.genres : [];
  const safeStreamings = Array.isArray(anime.streamings) ? anime.streamings : [];

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
            <img src={displayCover} alt={displayTitle} className="detail-cover-img" referrerPolicy="no-referrer" />
          </div>

          <div className="detail-meta-info">
            <h1 className="detail-title">{displayTitle}</h1>
            {anime.titleJa && anime.titleJa !== displayTitle && (
              <p className="detail-title-en">{anime.titleJa}</p>
            )}
            {anime.titleEn && anime.titleEn !== displayTitle && (
              <p className="detail-title-en">{anime.titleEn}</p>
            )}

            <div className="detail-badges-row">
              <span className="detail-badge">
                <Clock size={14} />
                {tYearSeason(anime.yearSeason)}
              </span>
              {richDetail.studio && (
                <span className="detail-badge">
                  <Film size={14} />
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
                    <Play size={16} style={{ color: 'var(--accent-color)' }} />
                    <div style={{ flex: 1, overflow: 'hidden' }}>
                      <div style={{ fontSize: '0.95rem', fontWeight: 700, textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden' }}>
                        {st.name || st.site}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: isFree ? '#4ade80' : 'var(--text-muted)' }}>
                        {isFree ? '免費 / 首播' : '付費會員'}
                      </div>
                    </div>
                    <ExternalLink size={14} style={{ opacity: 0.6 }} />
                  </a>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AnimeDetailPage;

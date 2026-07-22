import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useLocation } from 'react-router-dom';
import '@/components/core/AnimeCard.css';
import type { Anime, WatchedAnime } from '@/types';
import { Star, Heart, Edit2, Check, X, Trash2, RotateCcw } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAdMob } from '@/contexts/AdMobContext';
import { StreamingList } from '@/components/core/StreamingList';

interface AnimeCardProps {
  anime: Anime | WatchedAnime;
  isWatched: boolean;
  isPlanToWatch: boolean;
  onActionClick: (anime: Anime) => void;
  onPlanToWatchToggle: (anime: Anime) => void;
  displayTitle: string;
  onEditTitle: (originalZh: string, newTitle: string, id: string) => void;
  onResetTitle: (originalZh: string, id: string) => void;
  onRemoveReview: (id: string) => void;
  priorityLoad?: boolean;
}

interface PopoverPos {
  top: number;
  left: number;
  width: number;
}

const AnimeCard: React.FC<AnimeCardProps> = ({
  anime,
  isWatched,
  isPlanToWatch,
  onActionClick,
  onPlanToWatchToggle,
  displayTitle,
  onEditTitle,
  onResetTitle,
  onRemoveReview,
  priorityLoad = false,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { language, t, tCover, tGenre, tYearSeason } = useLanguage();
  const [isEditingTitle, setIsEditingTitle] = useState(false);

  const [newTitle, setNewTitle] = useState('');
  const [isConfirmingRemove, setIsConfirmingRemove] = useState(false);
  const [skipConfirm, setSkipConfirm] = useState(false);
  const [popoverPos, setPopoverPos] = useState<PopoverPos>({ top: 0, left: 0, width: 0 });
  const cardRef = useRef<HTMLDivElement>(null);
  const { hideAd, showAd } = useAdMob();

  useEffect(() => {
    if (isEditingTitle || isConfirmingRemove) {
      hideAd();
      return () => showAd();
    }
  }, [isEditingTitle, isConfirmingRemove, hideAd, showAd]);

  let baseTitle = anime.titleZh;
  if (language === 'en' && anime.titleEn) {
    baseTitle = anime.titleEn;
  } else if (language === 'ja' && anime.titleJa) {
    baseTitle = anime.titleJa;
  }

  const displayCover = tCover(anime);

  const getVisualLength = (str: string) => {
    let len = 0;
    for (let i = 0; i < str.length; i++) {
      len += str.charCodeAt(i) > 255 ? 2 : 1;
    }
    return len;
  };

  const safeGenres = Array.isArray(anime?.genres) ? anime.genres : [];
  const safeStreamings = Array.isArray(anime?.streamings) ? anime.streamings : [];

  const MAX_VISUAL_LENGTH = 22;
  let currentLen = 0;
  let visibleTagCount = 0;
  
  for (let i = 0; i < safeGenres.length; i++) {
    const textLen = getVisualLength(tGenre(safeGenres[i]));
    const isLast = i === safeGenres.length - 1;
    const badgeSpace = isLast ? 0 : 3.5; // Reserve space for "+N" badge
    
    if (visibleTagCount > 0 && (currentLen + textLen + badgeSpace) > MAX_VISUAL_LENGTH) {
      break;
    }
    currentLen += textLen + 1; // +1 for the gap between tags
    visibleTagCount++;
  }
  if (visibleTagCount === 0 && safeGenres.length > 0) visibleTagCount = 1;

  const handleTitleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTitle.trim()) {
      if (newTitle.trim() === baseTitle) {
        onResetTitle(anime.titleZh, anime.id);
      } else {
        onEditTitle(anime.titleZh, newTitle.trim(), anime.id);
      }
      setIsEditingTitle(false);
    }
  };

  const handleResetTitle = () => {
    onResetTitle(anime.titleZh, anime.id);
    setNewTitle(baseTitle);
  };

  const calculatePopupPosition = () => {
    if (cardRef.current) {
      const rect = cardRef.current.getBoundingClientRect();
      const popupWidth = Math.max(rect.width * 1.365, 315);
      const finalWidth = Math.min(popupWidth, window.innerWidth - 20); // 確保寬度左右至少保留 10px 防呆空間
      
      const rawLeft = rect.left + window.scrollX + rect.width * 0.5;
      const clampedLeft = Math.max(
        window.scrollX + finalWidth / 2 + 10,
        Math.min(rawLeft, window.scrollX + window.innerWidth - finalWidth / 2 - 10)
      );

      const estHeight = 240; // 評價確認與名稱編輯彈窗預估最大安全高度
      const rawTop = rect.top + window.scrollY + rect.height * 0.5;
      const clampedTop = Math.max(
        window.scrollY + estHeight / 2 + 10,
        Math.min(rawTop, window.scrollY + window.innerHeight - estHeight / 2 - 10)
      );
      
      setPopoverPos({
        top: clampedTop,
        left: clampedLeft,
        width: finalWidth,
      });
    }
  };

  useEffect(() => {
    if (isEditingTitle || isConfirmingRemove) {
      const handleResize = () => calculatePopupPosition();
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, [isEditingTitle, isConfirmingRemove]);

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setNewTitle(displayTitle);
    calculatePopupPosition();
    setIsEditingTitle(true);
  };

  const onRemoveReviewClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const shouldSkip = sessionStorage.getItem('skip_remove_review_confirm') === 'true';
    if (shouldSkip) {
      onRemoveReview(anime.id);
    } else {
      calculatePopupPosition();
      setIsConfirmingRemove(true);
    }
  };

  const handleConfirmRemove = () => {
    if (skipConfirm) {
      sessionStorage.setItem('skip_remove_review_confirm', 'true');
    }
    onRemoveReview(anime.id);
    setIsConfirmingRemove(false);
  };

  const handleCancel = () => setIsEditingTitle(false);

  return (
    <div className="anime-card fade-in" ref={cardRef}>
      {/* Edit title — Top Left */}
      <button
        className="edit-title-btn"
        onClick={handleEditClick}
        title={t('editDisplayName')}
      >
        <Edit2 size={14} />
      </button>

      {/* Remove review — Top Left (Next to Edit) */}
      {isWatched && (
        <button
          className="remove-review-btn"
          onClick={onRemoveReviewClick}
          title={t('removeReview')}
        >
          <Trash2 size={14} />
        </button>
      )}

      {/* Plan-to-watch — Top Right */}
      <button
        className={`heart-btn ${isPlanToWatch ? 'active' : ''}`}
        onClick={(e) => {
          e.stopPropagation();
          onPlanToWatchToggle(anime as Anime);
        }}
        title={isPlanToWatch ? t('removeFromPlan') : t('addToPlan')}
      >
        <Heart size={20} className={isPlanToWatch ? 'heart-fill' : ''} />
      </button>

      {/* Streaming menu — Top Right Below Heart */}
      <StreamingList streamings={safeStreamings} anime={anime} />

      <div 
        className="card-image-container clickable-cover"
        style={{ cursor: 'pointer' }}
        onClick={() => {
          navigate(`/anime/${encodeURIComponent(anime.id)}`, { state: { backgroundLocation: location } });
        }}
        title="點擊展開詳細資訊"
      >
        <img 
          src={displayCover} 
          alt={displayTitle} 
          className="card-image" 
          loading={priorityLoad ? "eager" : "lazy"} 
          fetchPriority={priorityLoad ? "high" : "auto"}
          referrerPolicy="no-referrer" 
        />

        {isWatched && (anime as WatchedAnime).userRating && (
          <div className="rating-badge">
            <Star size={14} fill="#fbbf24" />
            <span>{(anime as WatchedAnime).userRating}</span>
          </div>
        )}

        <div className="card-overlay">
          <button
            className={`action-btn ${isWatched ? 'watched' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              onActionClick(anime as Anime);
            }}
          >
            {isWatched ? t('viewReview') : t('addToWatched')}
          </button>
        </div>
      </div>

      <div className="card-content">
        <h3 className="card-title">{displayTitle}</h3>
        <p className="card-year">{tYearSeason(anime.yearSeason)}</p>

        <div className="card-tags-container">
          <div className="card-tags-summary">
            {safeGenres.slice(0, visibleTagCount).map(genre => (
              <span key={genre} className="genre-tag mini">{tGenre(genre)}</span>
            ))}
            {safeGenres.length > visibleTagCount && (
              <span className="genre-tag mini count">+{safeGenres.length - visibleTagCount}</span>
            )}
          </div>
          <div className="card-tags-full">
            {safeGenres.map(genre => (
              <span key={genre} className="genre-tag mini">{tGenre(genre)}</span>
            ))}
          </div>
        </div>

        {isWatched && (anime as WatchedAnime).userComment && (
          <p className="card-comment">"{(anime as WatchedAnime).userComment}"</p>
        )}
      </div>

      {/* Edit-title popup — Portal ensures it's unaffected by card transforms */}
      {isEditingTitle && createPortal(
        <>
          <div className="card-edit-backdrop" onClick={handleCancel} />
          <div
            className="card-edit-popup"
            style={{ top: popoverPos.top, left: popoverPos.left, width: popoverPos.width }}
            onClick={e => e.stopPropagation()}
          >
            <div className="card-edit-popup-label">{t('displayName')}</div>
            <form onSubmit={handleTitleSubmit}>
              <input
                type="text"
                className="card-edit-popup-input"
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                autoFocus
              />
              <div className="card-edit-popup-actions">
                <button
                  type="button"
                  className="card-edit-popup-btn reset"
                  onClick={handleResetTitle}
                  title={t('resetTitle')}
                >
                  <RotateCcw size={15} />
                </button>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button type="button" className="card-edit-popup-btn cancel" onClick={handleCancel} title={t('cancel')}>
                    <X size={15} />
                  </button>
                  <button type="submit" className="card-edit-popup-btn save" title={t('save')}>
                    <Check size={15} />
                  </button>
                </div>
              </div>
            </form>
          </div>
        </>,
        document.body,
      )}

      {/* Confirm Remove popup */}
      {isConfirmingRemove && createPortal(
        <>
          <div className="card-edit-backdrop" onClick={() => setIsConfirmingRemove(false)} />
          <div
            className="card-edit-popup confirm-remove-popup"
            style={{ top: popoverPos.top, left: popoverPos.left, width: popoverPos.width }}
            onClick={e => e.stopPropagation()}
          >
            <div className="card-edit-popup-label confirm-title">{t('confirmRemoveTitle')}</div>
            <hr className="confirm-divider" />
            <div className="confirm-desc">
              {t('confirmRemoveDesc')}
            </div>
            
            <label className="confirm-checkbox-label">
              <input 
                type="checkbox" 
                className="circle-checkbox"
                checked={skipConfirm}
                onChange={e => setSkipConfirm(e.target.checked)}
              />
              {t('doNotAskAgain')}
            </label>

            <div className="card-edit-popup-actions confirm-remove-actions">
              <button type="button" className="card-edit-popup-btn cancel" onClick={() => setIsConfirmingRemove(false)} title={t('cancel')}>
                <X size={15} />
              </button>
              <button type="button" className="card-edit-popup-btn save" onClick={handleConfirmRemove} title={t('confirmRemoveBtn')}>
                <Check size={15} />
              </button>
            </div>
          </div>
        </>,
        document.body,
      )}
    </div>
  );
};

export default React.memo(AnimeCard);

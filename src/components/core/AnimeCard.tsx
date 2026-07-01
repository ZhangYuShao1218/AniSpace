import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import '@/components/core/AnimeCard.css';
import type { Anime, WatchedAnime } from '@/types';
import { Star, Heart, Edit2, Check, X, Trash2 } from 'lucide-react';
import { useAnime } from '@/contexts/AnimeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAdMob } from '@/contexts/AdMobContext';
import { StreamingList } from '@/components/core/StreamingList';

interface AnimeCardProps {
  anime: Anime | WatchedAnime;
  isWatched: boolean;
  isPlanToWatch: boolean;
  onActionClick: (anime: Anime) => void;
  onPlanToWatchToggle: (anime: Anime) => void;
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
}) => {
  const { setCorrection, getCorrectedTitle, handleRemoveReview } = useAnime();
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
  
  const displayTitle = getCorrectedTitle(baseTitle);

  const displayCover = tCover(anime);

  const getVisualLength = (str: string) => {
    let len = 0;
    for (let i = 0; i < str.length; i++) {
      len += str.charCodeAt(i) > 255 ? 2 : 1;
    }
    return len;
  };

  const MAX_VISUAL_LENGTH = 22;
  let currentLen = 0;
  let visibleTagCount = 0;
  
  for (let i = 0; i < anime.genres.length; i++) {
    const textLen = getVisualLength(tGenre(anime.genres[i]));
    const isLast = i === anime.genres.length - 1;
    const badgeSpace = isLast ? 0 : 3.5; // Reserve space for "+N" badge
    
    if (visibleTagCount > 0 && (currentLen + textLen + badgeSpace) > MAX_VISUAL_LENGTH) {
      break;
    }
    currentLen += textLen + 1; // +1 for the gap between tags
    visibleTagCount++;
  }
  if (visibleTagCount === 0 && anime.genres.length > 0) visibleTagCount = 1;

  const handleTitleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTitle.trim()) {
      setCorrection(anime.titleZh, newTitle.trim());
      setIsEditingTitle(false);
    }
  };

  const calculatePopupPosition = () => {
    if (cardRef.current) {
      const rect = cardRef.current.getBoundingClientRect();
      const popupWidth = Math.max(rect.width * 1.365, 315);
      let left = rect.left + rect.width / 2 - popupWidth / 2;
      const padding = 16; // 16px padding from screen edge
      
      if (left < padding) {
        left = padding;
      } else if (left + popupWidth > window.innerWidth - padding) {
        left = window.innerWidth - popupWidth - padding;
      }
      
      setPopoverPos({
        top: rect.top + rect.height * 0.28,
        left: left,
        width: popupWidth,
      });
    }
  };

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
      handleRemoveReview(anime.id);
    } else {
      calculatePopupPosition();
      setIsConfirmingRemove(true);
    }
  };

  const handleConfirmRemove = () => {
    if (skipConfirm) {
      sessionStorage.setItem('skip_remove_review_confirm', 'true');
    }
    handleRemoveReview(anime.id);
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
        onClick={() => onPlanToWatchToggle(anime as Anime)}
        title={isPlanToWatch ? t('removeFromPlan') : t('addToPlan')}
      >
        <Heart size={20} className={isPlanToWatch ? 'heart-fill' : ''} />
      </button>

      {/* Streaming menu — Top Right Below Heart */}
      <StreamingList streamings={anime.streamings} anime={anime} />

      <div className="card-image-container">
        <img src={displayCover} alt={displayTitle} className="card-image" loading="lazy" referrerPolicy="no-referrer" />

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
            {anime.genres.slice(0, visibleTagCount).map(genre => (
              <span key={genre} className="genre-tag mini">{tGenre(genre)}</span>
            ))}
            {anime.genres.length > visibleTagCount && (
              <span className="genre-tag mini count">+{anime.genres.length - visibleTagCount}</span>
            )}
          </div>
          <div className="card-tags-full">
            {anime.genres.map(genre => (
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
                <button type="button" className="card-edit-popup-btn cancel" onClick={handleCancel} title={t('cancel')}>
                  <X size={15} />
                </button>
                <button type="submit" className="card-edit-popup-btn save" title={t('save')}>
                  <Check size={15} />
                </button>
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
            className="card-edit-popup"
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

            <div className="card-edit-popup-actions">
              <button type="button" className="card-edit-popup-btn cancel" onClick={() => setIsConfirmingRemove(false)} title={t('cancel')}>
                <X size={15} />
              </button>
              <button type="button" className="card-edit-popup-btn save" onClick={handleConfirmRemove} title={t('confirmRemoveBtn')} style={{ color: '#f87171' }}>
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

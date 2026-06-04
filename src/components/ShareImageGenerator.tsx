import React, { forwardRef } from 'react';
import type { Anime, WatchedAnime } from '../types';
import { Star } from 'lucide-react';
import './ShareImageGenerator.css';

import { useLanguage } from '../contexts/LanguageContext';

export interface ShareImageGeneratorProps {
  animes: (Anime | WatchedAnime)[];
  isWatched: boolean;
  gridCount: 4 | 9 | 16 | 25;
  customTitle?: string;
}

export const ShareImageGenerator = forwardRef<HTMLDivElement, ShareImageGeneratorProps>(
  ({ animes, isWatched, gridCount, customTitle }, ref) => {
    const { t, tTitle, tCover } = useLanguage();
    
    const columns = Math.sqrt(gridCount); // 2, 3, or 4
    
    // Fill empty slots if less than gridCount
    const paddedAnimes = [...animes];
    while (paddedAnimes.length < gridCount) {
      paddedAnimes.push({
        id: `empty-${paddedAnimes.length}`,
        titleZh: '',
        yearSeason: '',
        coverImage: '',
        genres: []
      });
    }

    return (
      <div 
        ref={ref} 
        className={`share-generator-container grid-${gridCount} ${isWatched ? 'is-watched' : 'is-plan'}`}
        style={{
          '--cols': columns,
          position: 'fixed',
          top: '0',
          left: '0',
          zIndex: -9999,
          opacity: 0.001,
        } as React.CSSProperties}
      >
        <div className="share-header">
          <h2>
            {customTitle || (isWatched ? t('defaultShareTitleWatched') : t('defaultShareTitlePlan'))}
          </h2>
          <div className={`share-brand ${gridCount === 25 ? 'bingo-instruction' : ''}`}>
            {gridCount === 25 ? t('bingoInstruction') : t('anispaceLibrary')}
          </div>
        </div>
        
        <div className="share-grid">
          {paddedAnimes.map((anime) => {
            const isEmpty = !anime.titleZh;
            const watched = isWatched && !isEmpty ? (anime as WatchedAnime) : null;
            
            return (
              <div key={anime.id} className={`share-cell ${isEmpty ? 'empty' : ''}`}>
                {!isEmpty && (
                  <>
                    <img 
                      src={tCover(anime)} 
                      alt={tTitle(anime)} 
                      className="share-cover" 
                    />
                    {gridCount !== 25 && (
                      <div className="share-info-overlay">
                        <div className="share-title">{tTitle(anime)}</div>
                        {watched && (
                          <div className="share-watched-details">
                            <div className="share-rating">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <Star
                                  key={i}
                                  size={12}
                                  className={i < watched.userRating ? 'star-filled' : 'star-empty'}
                                />
                              ))}
                            </div>
                            {watched.userComment && (
                              <div className="share-comment">"{watched.userComment}"</div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }
);

ShareImageGenerator.displayName = 'ShareImageGenerator';

import React, { forwardRef, useState, useEffect, useImperativeHandle, useRef } from 'react';
import { Capacitor, CapacitorHttp } from '@capacitor/core';
import { toPng } from 'html-to-image';
import type { Anime, WatchedAnime } from '@/types';
import { Star } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import '@/components/share/ShareImageGenerator.css';

import { useLanguage } from '@/contexts/LanguageContext';

export interface ShareImageGeneratorProps {
  animes: (Anime | WatchedAnime)[];
  isWatched: boolean;
  gridCount: 4 | 9 | 16 | 25;
  customTitle?: string;
  onProgress?: (loaded: number, total: number) => void;
}

export interface ShareImageGeneratorRef {
  generateImage: () => Promise<string>;
}

export const ShareImageGenerator = forwardRef<ShareImageGeneratorRef, ShareImageGeneratorProps>(
  ({ animes, isWatched, gridCount, customTitle, onProgress }, ref) => {
    const { t, tTitle, tCover } = useLanguage();
    
    const [base64Images, setBase64Images] = useState<Record<string, string>>({});
    const containerRef = useRef<HTMLDivElement>(null);

    // Keep track of which images are loaded to await them
    const loadedCountRef = useRef(0);
    const expectedCountRef = useRef(0);
    
    // We will resolve this promise when all base64 images are done
    const [imagesReadyPromise, setImagesReadyPromise] = useState<{promise: Promise<void>, resolve: () => void} | null>(null);

    useEffect(() => {
      let isMounted = true;
      
      const validAnimes = animes.filter(a => !!a.titleZh && !!tCover(a));
      expectedCountRef.current = validAnimes.length;
      loadedCountRef.current = 0;
      
      let resolvePromise: () => void;
      const promise = new Promise<void>((r) => { resolvePromise = r; });
      setImagesReadyPromise({ promise, resolve: resolvePromise! });

      if (validAnimes.length === 0) {
        resolvePromise!();
        return;
      }
      const loadImages = async () => {
        if (!Capacitor.isNativePlatform()) {
          // Web fallback: Revert to the original way, letting html-to-image handle it
          if (isMounted && resolvePromise) resolvePromise();
          return;
        }

        await Promise.all(animes.map(async (anime) => {
          if (!anime.titleZh) return; // Skip empty placeholders
          const originalCover = tCover(anime);
          if (originalCover && !base64Images[anime.id]) {
            try {
              // Use CapacitorHttp to bypass CORS natively on App
              const response = await CapacitorHttp.get({
                url: originalCover,
                responseType: 'blob'
              });
              if (isMounted) {
                if (response.data) {
                  // CapacitorHttp returns base64 encoded string when responseType is blob
                  setBase64Images(prev => ({...prev, [anime.id]: `data:image/jpeg;base64,${response.data}`}));
                }
                checkIfDone();
              }
            } catch (e) {
              console.warn('Failed to pre-load image as base64', e);
              checkIfDone(); // Count as done even if failed to avoid blocking
            }
          } else {
            checkIfDone(); // Already cached
          }
        }));
      };
      
      const checkIfDone = () => {
        loadedCountRef.current++;
        if (onProgress) {
          onProgress(loadedCountRef.current, expectedCountRef.current);
        }
        if (loadedCountRef.current >= expectedCountRef.current) {
           if (isMounted && resolvePromise) resolvePromise();
        }
      };
      
      loadImages();
      return () => { isMounted = false; };
    }, [animes, tCover]);

    useImperativeHandle(ref, () => ({
      generateImage: async () => {
        if (!containerRef.current) throw new Error("Container not mounted");
        
        // Wait for all base64 images to finish downloading
        if (imagesReadyPromise) {
          await imagesReadyPromise.promise;
        }
        
        // Additional delay for browser to actually render the new src
        await new Promise(r => setTimeout(r, 800));

        const isLightMode = document.documentElement.getAttribute('data-theme') === 'light';
        const bgColor = isLightMode ? '#fcf9f2' : '#0f172a';

        return await toPng(containerRef.current, {
          cacheBust: !Capacitor.isNativePlatform(), // Web needs cacheBust to bypass CORS cache issues from normal img tags
          pixelRatio: 2,
          skipFonts: true, // Prevents html-to-image from scanning stylesheets and downloading fonts, solving the main thread block
          backgroundColor: bgColor,
          style: {
            opacity: '1',
            left: '0',
            top: '0',
            transform: 'none'
          }
        });
      }
    }));

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
        ref={containerRef} 
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
        <div className="share-top-corner">
          <div className="share-corner-qrcode">
            <QRCodeSVG 
              value="https://anispace.zhangyushao.dev" 
              size={68}
              level="M"
              bgColor="#ffffff"
              fgColor="#0f172a"
            />
          </div>
        </div>

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
            const starSize = gridCount === 4 ? 20 : gridCount === 9 ? 16 : 12;
            
            return (
              <div key={anime.id} className={`share-cell ${isEmpty ? 'empty' : ''}`}>
                {!isEmpty && (
                  <>
                    <img 
                      src={base64Images[anime.id] || tCover(anime)} 
                      alt={tTitle(anime)} 
                      className="share-cover" 
                    />
                    {gridCount !== 25 && (
                      <div className="share-info-overlay">
                        <div className="share-title">{tTitle(anime)}</div>
                        {watched && (
                          <div className="share-watched-details">
                            <div className="share-rating">
                              {Array.from({ length: 5 }).map((_, i) => {
                                const fullThreshold = i * 2 + 2;
                                const halfThreshold = i * 2 + 1;
                                const rating = watched.userRating || 0;
                                
                                if (rating >= fullThreshold) {
                                  return <Star key={i} size={starSize} className="star-filled" style={{ display: 'block' }} />;
                                } else if (rating === halfThreshold) {
                                  return (
                                    <div key={i} style={{ position: 'relative', width: starSize, height: starSize }}>
                                      <Star size={starSize} className="star-empty" style={{ position: 'absolute', top: 0, left: 0, display: 'block' }} />
                                      <div style={{ position: 'absolute', top: 0, left: 0, overflow: 'hidden', width: '50%', height: '100%' }}>
                                        <Star size={starSize} className="star-filled" style={{ position: 'absolute', top: 0, left: 0, display: 'block' }} />
                                      </div>
                                    </div>
                                  );
                                } else {
                                  return <Star key={i} size={starSize} className="star-empty" style={{ display: 'block' }} />;
                                }
                              })}
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

        <div className="share-bottom-right">
          <span className="share-corner-url">https://anispace.zhangyushao.dev</span>
        </div>
      </div>
    );
  }
);

ShareImageGenerator.displayName = 'ShareImageGenerator';

import React from 'react';
import { Check, ImageIcon } from 'lucide-react';
import type { Anime, WatchedAnime } from '../types';
import type { ExportMode } from './ShareModal';

interface ShareListProps {
  filteredAnimes: (Anime | WatchedAnime)[];
  selectedIds: Set<string>;
  mode: ExportMode;
  requiredCount: number;
  handleToggleSelect: (id: string) => void;
}

export const ShareList: React.FC<ShareListProps> = React.memo(({
  filteredAnimes,
  selectedIds,
  mode,
  requiredCount,
  handleToggleSelect
}) => {
  if (filteredAnimes.length === 0) {
    return (
      <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)', gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', justifyContent: 'center' }}>
        <ImageIcon size={32} style={{ opacity: 0.3 }} />
        <span style={{ fontSize: '0.95rem' }}>找不到符合的動畫，或目前尚未有動畫可供分享。</span>
      </div>
    );
  }

  return (
    <>
      {filteredAnimes.map(anime => {
        const isSelected = selectedIds.has(anime.id);
        const isDisabled = !isSelected && mode !== 'SHEET' && selectedIds.size >= requiredCount;
        
        return (
          <div 
            key={anime.id} 
            className={`share-anime-item ${isSelected ? 'selected' : ''} ${isDisabled ? 'disabled' : ''}`}
            onClick={() => !isDisabled && handleToggleSelect(anime.id)}
          >
            <img src={anime.coverImage} alt={anime.titleZh} className="share-item-cover" />
            <span className="share-item-title">{anime.titleZh}</span>
            <div className="share-item-check">
              {isSelected && <Check size={14} />}
            </div>
          </div>
        );
      })}
    </>
  );
});

ShareList.displayName = 'ShareList';

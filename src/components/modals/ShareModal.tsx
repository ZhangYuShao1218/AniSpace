import React, { useState, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, FileSpreadsheet, Loader2, ThumbsUp, Share2, Circle, CheckCircle2 } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { useShareTask } from '@/contexts/ShareTaskContext';

const ShuffleIcon = ({ size = 24, className = '' }: { size?: number | string, className?: string }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="m18 14 4 4-4 4" />
    <path d="m18 2 4 4-4 4" />
    <path d="M2 18h1.973a4 4 0 0 0 3.3-1.7l5.454-8.6a4 4 0 0 1 3.3-1.7H22" />
    <path d="M2 6h1.972a4 4 0 0 1 3.6 2.2" />
    <path d="M22 18h-6.041a4 4 0 0 1-3.3-1.8l-.359-.45" />
  </svg>
);
import type { Anime, WatchedAnime } from '@/types';
import { exportToGoogleSheet } from '@/utils/googleSheets';
import { useGoogleSync } from '@/contexts/GoogleSyncContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { ShareModeSelector } from '@/components/share/ShareModeSelector';
import { ShareList } from '@/components/share/ShareList';
import '@/components/modals/ShareModal.css';

export type ExportMode = 'SHEET' | 'GRID_4' | 'GRID_9' | 'GRID_16' | 'GRID_25';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  animes: (Anime | WatchedAnime)[];
  isWatched: boolean;
}

export const ShareModal: React.FC<ShareModalProps> = ({ isOpen, onClose, animes, isWatched }) => {
  const [mode, setMode] = useState<ExportMode>('GRID_9');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const { accessToken, login } = useGoogleSync();
  const { t, tTitle } = useLanguage();
  const [customTitle, setCustomTitle] = useState('');
  
  const { isGenerating, startTask } = useShareTask();
  const wasGenerating = React.useRef(false);

  // For PC Web: Automatically close modal when generation is done
  React.useEffect(() => {
    if (isGenerating) {
      wasGenerating.current = true;
    } else if (wasGenerating.current) {
      wasGenerating.current = false;
      if (!Capacitor.isNativePlatform()) {
        onClose();
      }
    }
  }, [isGenerating, onClose, Capacitor]);

  const requiredCount = useMemo(() => {
    if (mode === 'GRID_4') return 4;
    if (mode === 'GRID_9') return 9;
    if (mode === 'GRID_16') return 16;
    if (mode === 'GRID_25') return 25;
    return 0;
  }, [mode]);

  const filteredAnimes = useMemo(() => {
    if (!searchTerm) return animes;
    const lowerTerm = searchTerm.toLowerCase();
    return animes.filter(a => tTitle(a).toLowerCase().includes(lowerTerm));
  }, [animes, searchTerm, tTitle]);

  const selectedAnimes = useMemo(() => {
    if (selectedIds.size === 0) return [];
    return animes.filter(a => selectedIds.has(a.id));
  }, [animes, selectedIds]);

  const handleToggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        if (mode !== 'SHEET' && newSet.size >= requiredCount) {
          return prev; // Ignore if max reached
        }
        newSet.add(id);
      }
      return newSet;
    });
  }, [mode, requiredCount]);

  const handleClearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const handleSelectAll = () => {
    if (selectedIds.size === animes.length && animes.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(animes.map(a => a.id)));
    }
  };

  const handleRandomSelect = () => {
    const shuffled = [...animes].sort(() => 0.5 - Math.random());
    const randomIds = shuffled.slice(0, requiredCount).map(a => a.id);
    setSelectedIds(new Set(randomIds));
  };

  if (!isOpen) return null;

  const handleExportSheet = async () => {
    if (!accessToken) {
      alert(t('loginRequiredAlert'));
      login();
      return;
    }
    
    setIsProcessing(true);
    try {
      const dataToExport = selectedIds.size > 0 ? selectedAnimes : animes;
      const url = await exportToGoogleSheet(accessToken, dataToExport, isWatched);
      window.open(url, '_blank');
    } catch (error) {
      console.error(error);
      alert(t('exportFailedAlert'));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGenerateImage = async () => {
    if (selectedIds.size === 0 || selectedIds.size > requiredCount) {
      alert(t('selectAnimeAlert').replace('{count}', requiredCount.toString()));
      return;
    }
    
    startTask({
      animes: selectedAnimes,
      isWatched,
      customTitle: customTitle || (isWatched ? t('defaultShareTitleWatched') : t('defaultShareTitlePlan')),
      gridCount: requiredCount as 4 | 9 | 16 | 25
    });
    
    if (Capacitor.isNativePlatform()) {
      onClose();
    }
  };

  return createPortal(
    <>
      {isOpen && (
        <div className="share-modal-backdrop" onClick={isProcessing ? undefined : onClose}>
          <div className="share-modal-content" onClick={e => e.stopPropagation()}>
            <button 
              className="share-modal-close" 
              onClick={onClose} 
              disabled={isProcessing} 
              style={{ opacity: isProcessing ? 0.5 : 1, cursor: isProcessing ? 'not-allowed' : 'pointer' }}
            >
              <X size={20} />
            </button>
          
            <h2 className="share-modal-title" style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <ThumbsUp size={28} /> {t('recommendToOthers')}
            </h2>
            <p className="share-modal-subtitle" style={{ marginBottom: '24px' }}>{t('shareModalSubtitle')}</p>

            <ShareModeSelector 
              mode={mode} 
              setMode={setMode} 
              isProcessing={isProcessing} 
              isWatched={isWatched} 
              onClearSelection={handleClearSelection}
            />

            <div className="share-selection-area">
              <div className="selection-header">
                <div className="selection-header-left">
                  <h3 style={{ margin: 0 }}>
                    {mode === 'GRID_25' ? t('animeBingo') : mode === 'SHEET' ? t('animeList') : t('shareAnime')} ({selectedIds.size}/{mode === 'SHEET' ? animes.length : requiredCount})
                  </h3>
                  {mode === 'SHEET' && (
                    <div 
                      className="share-action-btn"
                      onClick={handleSelectAll}
                    >
                      {selectedIds.size === animes.length && animes.length > 0 ? (
                        <CheckCircle2 size={20} className="select-all-icon-checked" />
                      ) : (
                        <Circle size={20} color="currentColor" />
                      )}
                      <span>{t('selectAll')}</span>
                    </div>
                  )}
                  {mode === 'GRID_25' && (
                    <div 
                      className="random-select-btn"
                      onClick={handleRandomSelect}
                      title={t('randomSelectTooltip')}
                    >
                      <ShuffleIcon size={16} />
                      <span>{t('randomSelect')}</span>
                    </div>
                  )}
                </div>
                <input 
                  type="text" 
                  placeholder={t('searchPlaceholder')} 
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="share-search-input"
                />
              </div>
              <hr className="share-divider" />

              <div className="share-anime-list">
                <ShareList 
                  filteredAnimes={filteredAnimes}
                  selectedIds={selectedIds}
                  mode={mode}
                  requiredCount={requiredCount}
                  handleToggleSelect={handleToggleSelect}
                />
              </div>
            </div>

            <div className={`share-modal-actions ${mode === 'SHEET' ? 'sheet-mode' : ''}`}>
              {mode !== 'SHEET' && (
                <div className="share-custom-title-section">
                  <label>{t('customTitleLabel')}</label>
                  <input 
                    type="text" 
                    value={customTitle} 
                    onChange={e => setCustomTitle(e.target.value)} 
                    className="share-search-input custom-title-input" 
                    placeholder={isWatched ? t('defaultShareTitleWatched') : t('defaultShareTitlePlan')}
                  />
                </div>
              )}
              {mode === 'SHEET' ? (
                <button className="btn-primary share-btn" onClick={handleExportSheet} disabled={isProcessing}>
                  {isProcessing ? <Loader2 className="animate-spin" size={18} /> : <FileSpreadsheet size={18} />}
                  {isProcessing ? t('creatingSheet') : t('createList')}
                </button>
              ) : (
                <button className="btn-primary share-btn" onClick={handleGenerateImage} disabled={isProcessing || isGenerating || selectedIds.size === 0 || selectedIds.size > requiredCount}>
                  {isProcessing || isGenerating ? <Loader2 className="animate-spin" size={18} /> : <Share2 size={18} />}
                  {isProcessing || isGenerating ? t('processing') : t('share')}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>,
    document.body
  );
};

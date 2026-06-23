import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { FileSpreadsheet, ImageIcon, ChevronDown } from 'lucide-react';
import type { ExportMode } from '@/components/modals/ShareModal';
import { useLanguage } from '@/contexts/LanguageContext';

const Grid3X3Icon = ({ size = 24, className = '' }: { size?: number | string, className?: string }) => (
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
    <rect width="18" height="18" x="3" y="3" rx="2" />
    <path d="M3 9h18" />
    <path d="M3 15h18" />
    <path d="M9 3v18" />
    <path d="M15 3v18" />
  </svg>
);

interface ShareModeSelectorProps {
  mode: ExportMode;
  setMode: (mode: ExportMode) => void;
  isProcessing: boolean;
  isWatched: boolean;
  onClearSelection: () => void;
}

export const ShareModeSelector: React.FC<ShareModeSelectorProps> = React.memo(({
  mode,
  setMode,
  isProcessing,
  onClearSelection
}) => {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);

  const handleModeChange = (newMode: ExportMode) => {
    if (isProcessing) return;
    if (newMode !== mode) {
      setMode(newMode);
      onClearSelection();
    }
    setIsOpen(false);
  };

  const getModeTitle = (m: ExportMode) => {
    switch (m) {
      case 'SHEET': return t('modeSheet');
      case 'GRID_4': return t('modeGrid4');
      case 'GRID_9': return t('modeGrid9');
      case 'GRID_16': return t('modeGrid16');
      case 'GRID_25': return t('modeBingo');
      default: return '';
    }
  };

  const getGridDesc = (num: string) => {
    return t('modeGridDesc').replace('{num}', num);
  };

  return (
    <>
      <div 
        className={`share-mode-trigger ${isProcessing ? 'disabled' : ''}`}
        onClick={() => !isProcessing && setIsOpen(true)}
      >
        <div className="trigger-label">{t('selectShareMode')}</div>
        <div className="trigger-value">
          <span className="current-mode-text">{getModeTitle(mode)}</span>
          <ChevronDown size={18} />
        </div>
      </div>

      {isOpen && createPortal(
        <div className="share-mode-modal-backdrop fade-in" onClick={() => setIsOpen(false)}>
          <div className="share-mode-modal-content zoom-in" onClick={(e) => e.stopPropagation()}>
            <div className="share-mode-modal-header">
              <div className="header-titles">
                <h3>{t('selectShareMode')}</h3>
                <p className="share-modal-subtitle" style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  {t('shareModalSubtitle')}
                </p>
              </div>
            </div>
            
            <div className="share-mode-list">
              <div
                className={`share-mode-item ${mode === 'SHEET' ? 'active' : ''}`}
                onClick={() => handleModeChange('SHEET')}
              >
                <div className="mode-icon"><FileSpreadsheet size={24} /></div>
                <div className="mode-info">
                  <h4>{t('modeSheet')}</h4>
                  <p>{t('modeSheetDesc')}</p>
                </div>
              </div>

              <div
                className={`share-mode-item ${mode === 'GRID_4' ? 'active' : ''}`}
                onClick={() => handleModeChange('GRID_4')}
              >
                <div className="mode-icon"><ImageIcon size={24} /></div>
                <div className="mode-info">
                  <h4>{t('modeGrid4')}</h4>
                  <p>{getGridDesc('4')}</p>
                </div>
              </div>

              <div
                className={`share-mode-item ${mode === 'GRID_9' ? 'active' : ''}`}
                onClick={() => handleModeChange('GRID_9')}
              >
                <div className="mode-icon"><ImageIcon size={24} /></div>
                <div className="mode-info">
                  <h4>{t('modeGrid9')}</h4>
                  <p>{getGridDesc('9')}</p>
                </div>
              </div>

              <div
                className={`share-mode-item ${mode === 'GRID_16' ? 'active' : ''}`}
                onClick={() => handleModeChange('GRID_16')}
              >
                <div className="mode-icon"><ImageIcon size={24} /></div>
                <div className="mode-info">
                  <h4>{t('modeGrid16')}</h4>
                  <p>{getGridDesc('16')}</p>
                </div>
              </div>

              <div
                className={`share-mode-item ${mode === 'GRID_25' ? 'active' : ''}`}
                onClick={() => handleModeChange('GRID_25')}
              >
                <div className="mode-icon"><Grid3X3Icon size={24} /></div>
                <div className="mode-info">
                  <h4>{t('modeBingo')}</h4>
                  <p>{t('modeBingoDesc')}</p>
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
});

ShareModeSelector.displayName = 'ShareModeSelector';

import React from 'react';
import { HelpCircle, FileSpreadsheet, ImageIcon } from 'lucide-react';

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
import type { ExportMode } from '@/components/modals/ShareModal';
import { useLanguage } from '@/contexts/LanguageContext';

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

  const handleModeChange = (newMode: ExportMode) => {
    if (isProcessing) return;
    if (newMode !== mode) {
      setMode(newMode);
      onClearSelection();
    }
  };

  return (
    <div className="share-modes">
      <div
        className={`share-mode-btn ${mode === 'SHEET' ? 'active' : ''} ${isProcessing ? 'disabled' : ''}`}
        style={{ opacity: isProcessing ? 0.5 : 1, cursor: isProcessing ? 'not-allowed' : 'pointer' }}
        onClick={() => handleModeChange('SHEET')}
      >
        <FileSpreadsheet size={18} />
        <span>{t('modeSheet')}</span>
        <div className="share-tooltip-container" onClick={(e) => e.stopPropagation()}>
          <HelpCircle size={16} className="help-icon" />
          <div className="share-tooltip">{t('modeSheetDesc')}</div>
        </div>
      </div>

      <div
        className={`share-mode-btn ${mode === 'GRID_4' ? 'active' : ''} ${isProcessing ? 'disabled' : ''}`}
        style={{ opacity: isProcessing ? 0.5 : 1, cursor: isProcessing ? 'not-allowed' : 'pointer' }}
        onClick={() => handleModeChange('GRID_4')}
      >
        <ImageIcon size={18} />
        <span>{t('modeGrid4')}</span>
        <div className="share-tooltip-container" onClick={(e) => e.stopPropagation()}>
          <HelpCircle size={16} className="help-icon" />
          <div className="share-tooltip">
            {t('modeGridDesc').split('\n').map((line, i) => (
              <React.Fragment key={i}>
                {line.replace('{num}', '4')}
                {i === 0 && <br />}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      <div
        className={`share-mode-btn ${mode === 'GRID_9' ? 'active' : ''} ${isProcessing ? 'disabled' : ''}`}
        style={{ opacity: isProcessing ? 0.5 : 1, cursor: isProcessing ? 'not-allowed' : 'pointer' }}
        onClick={() => handleModeChange('GRID_9')}
      >
        <ImageIcon size={18} />
        <span>{t('modeGrid9')}</span>
        <div className="share-tooltip-container" onClick={(e) => e.stopPropagation()}>
          <HelpCircle size={16} className="help-icon" />
          <div className="share-tooltip">
            {t('modeGridDesc').split('\n').map((line, i) => (
              <React.Fragment key={i}>
                {line.replace('{num}', '9')}
                {i === 0 && <br />}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      <div
        className={`share-mode-btn ${mode === 'GRID_16' ? 'active' : ''} ${isProcessing ? 'disabled' : ''}`}
        style={{ opacity: isProcessing ? 0.5 : 1, cursor: isProcessing ? 'not-allowed' : 'pointer' }}
        onClick={() => handleModeChange('GRID_16')}
      >
        <ImageIcon size={18} />
        <span>{t('modeGrid16')}</span>
        <div className="share-tooltip-container" onClick={(e) => e.stopPropagation()}>
          <HelpCircle size={16} className="help-icon" />
          <div className="share-tooltip">
            {t('modeGridDesc').split('\n').map((line, i) => (
              <React.Fragment key={i}>
                {line.replace('{num}', '16')}
                {i === 0 && <br />}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      <div
        className={`share-mode-btn ${mode === 'GRID_25' ? 'active' : ''} ${isProcessing ? 'disabled' : ''}`}
        style={{ opacity: isProcessing ? 0.5 : 1, cursor: isProcessing ? 'not-allowed' : 'pointer' }}
        onClick={() => handleModeChange('GRID_25')}
      >
        <Grid3X3Icon size={18} />
        <span>{t('modeBingo')}</span>
        <div className="share-tooltip-container" onClick={(e) => e.stopPropagation()}>
          <HelpCircle size={16} className="help-icon" />
          <div className="share-tooltip">
            {t('modeBingoDesc').split('\n').map((line, i) => (
              <React.Fragment key={i}>
                {line}
                {i === 0 && <br />}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
});

ShareModeSelector.displayName = 'ShareModeSelector';

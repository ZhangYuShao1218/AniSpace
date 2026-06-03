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
import type { ExportMode } from './ShareModal';

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
  isWatched,
  onClearSelection
}) => {
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
        <span>A. 試算表</span>
        <div className="share-tooltip-container">
          <HelpCircle size={16} className="help-icon" />
          <div className="share-tooltip">完整輸出所有資料至 Google Drive 試算表。</div>
        </div>
      </div>

      <div 
        className={`share-mode-btn ${mode === 'GRID_4' ? 'active' : ''} ${isProcessing ? 'disabled' : ''}`} 
        style={{ opacity: isProcessing ? 0.5 : 1, cursor: isProcessing ? 'not-allowed' : 'pointer' }} 
        onClick={() => handleModeChange('GRID_4')}
      >
        <ImageIcon size={18} />
        <span>B. 4格圖片</span>
        <div className="share-tooltip-container">
          <HelpCircle size={16} className="help-icon" />
          <div className="share-tooltip">挑選 4 部動畫產生圖片，<br/>並和好友一同分享你的神作</div>
        </div>
      </div>

      <div 
        className={`share-mode-btn ${mode === 'GRID_9' ? 'active' : ''} ${isProcessing ? 'disabled' : ''}`} 
        style={{ opacity: isProcessing ? 0.5 : 1, cursor: isProcessing ? 'not-allowed' : 'pointer' }} 
        onClick={() => handleModeChange('GRID_9')}
      >
        <ImageIcon size={18} />
        <span>C. 9格圖片</span>
        <div className="share-tooltip-container">
          <HelpCircle size={16} className="help-icon" />
          <div className="share-tooltip">挑選 9 部動畫產生圖片，<br/>並和好友一同分享你的神作</div>
        </div>
      </div>

      {!isWatched && (
        <div 
          className={`share-mode-btn ${mode === 'GRID_16' ? 'active' : ''} ${isProcessing ? 'disabled' : ''}`} 
          style={{ opacity: isProcessing ? 0.5 : 1, cursor: isProcessing ? 'not-allowed' : 'pointer' }} 
          onClick={() => handleModeChange('GRID_16')}
        >
          <ImageIcon size={18} />
          <span>D. 16格圖片</span>
          <div className="share-tooltip-container">
            <HelpCircle size={16} className="help-icon" />
            <div className="share-tooltip">挑選 16 部動畫產生圖片，<br/>並和好友一同分享你的神作</div>
          </div>
        </div>
      )}

      <div 
        className={`share-mode-btn ${mode === 'GRID_25' ? 'active' : ''} ${isProcessing ? 'disabled' : ''}`} 
        style={{ opacity: isProcessing ? 0.5 : 1, cursor: isProcessing ? 'not-allowed' : 'pointer' }} 
        onClick={() => handleModeChange('GRID_25')}
      >
        <Grid3X3Icon size={18} />
        <span>{isWatched ? 'D.' : 'E.'} 25格賓果</span>
        <div className="share-tooltip-container">
          <HelpCircle size={16} className="help-icon" />
          <div className="share-tooltip">生成專屬動畫清單，<br/>問問朋友們看過幾部！</div>
        </div>
      </div>
    </div>
  );
});

ShareModeSelector.displayName = 'ShareModeSelector';

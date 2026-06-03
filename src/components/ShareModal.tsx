import React, { useState, useRef, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, FileSpreadsheet, Loader2, ThumbsUp, Share2, Circle, CheckCircle2 } from 'lucide-react';
import { toPng } from 'html-to-image';
import type { Anime, WatchedAnime } from '../types';
import { ShareImageGenerator } from './ShareImageGenerator';
import { exportToGoogleSheet } from '../utils/googleSheets';
import { useGoogleSync } from '../contexts/GoogleSyncContext';
import { ShareModeSelector } from './ShareModeSelector';
import { ShareList } from './ShareList';
import './ShareModal.css';

export type ExportMode = 'SHEET' | 'GRID_4' | 'GRID_9' | 'GRID_16';

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
  const [customTitle, setCustomTitle] = useState(isWatched ? '我的神作動畫紀錄' : '此生必看清單');
  
  const { accessToken, login } = useGoogleSync();
  const imageGeneratorRef = useRef<HTMLDivElement>(null);

  const requiredCount = useMemo(() => {
    if (mode === 'GRID_4') return 4;
    if (mode === 'GRID_9') return 9;
    if (mode === 'GRID_16') return 16;
    return 0;
  }, [mode]);

  const filteredAnimes = useMemo(() => {
    if (!searchTerm) return animes;
    const lowerTerm = searchTerm.toLowerCase();
    return animes.filter(a => a.titleZh.toLowerCase().includes(lowerTerm));
  }, [animes, searchTerm]);

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

  if (!isOpen) return null;

  const handleExportSheet = async () => {
    if (!accessToken) {
      alert('請先登入 Google 帳號以建立試算表！');
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
      alert('匯出失敗，請重試或確認權限。');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGenerateImage = async () => {
    if (selectedIds.size === 0 || selectedIds.size > requiredCount) {
      alert(`請選擇 1 到 ${requiredCount} 部動畫！`);
      return;
    }
    
    if (!imageGeneratorRef.current) return;
    
    setIsProcessing(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 800));
      
      try { await toPng(imageGeneratorRef.current, { cacheBust: true, style: { opacity: '1' } }); } catch (e) {}

      const isLightMode = document.documentElement.getAttribute('data-theme') === 'light';
      const bgColor = isLightMode ? '#fcf9f2' : '#0f172a';

      const dataUrl = await toPng(imageGeneratorRef.current, { 
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: bgColor,
        style: {
          opacity: '1',
          left: '0',
          top: '0',
          transform: 'none'
        }
      });
      const filename = `AniSpace_${isWatched ? '紀錄' : '期待'}_分享.png`;
      
      try {
        const res = await fetch(dataUrl);
        const blob = await res.blob();
        const file = new File([blob], filename, { type: 'image/png' });

        if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: 'AniSpace 動畫分享',
            text: '來看看我的寶藏動畫推薦！',
            files: [file]
          });
        } else {
          const link = document.createElement('a');
          link.download = filename;
          link.href = dataUrl;
          link.click();
        }
      } catch (shareErr) {
        console.error('Share API failed, falling back to download', shareErr);
        const link = document.createElement('a');
        link.download = filename;
        link.href = dataUrl;
        link.click();
      }
    } catch (err) {
      console.error(err);
      alert('圖片產生失敗，可能是圖片跨網域 (CORS) 問題，請稍後再試。');
    } finally {
      setIsProcessing(false);
    }
  };

  return createPortal(
    <>
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
            <ThumbsUp size={28} /> 推坑別人
          </h2>
          <p className="share-modal-subtitle" style={{ marginBottom: '24px' }}>選擇一種方式，將您的寶藏動畫分享出去吧！</p>

          <ShareModeSelector 
            mode={mode} 
            setMode={setMode} 
            isProcessing={isProcessing} 
            isWatched={isWatched} 
            onClearSelection={handleClearSelection}
          />

          <div className="share-selection-area">
            <div className="selection-header" style={{ display: 'flex', alignItems: 'flex-end', gap: '12px', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <h3 style={{ margin: 0 }}>
                  分享動畫 ({selectedIds.size}/{mode === 'SHEET' ? animes.length : requiredCount})
                </h3>
                {mode === 'SHEET' && (
                  <div 
                    onClick={handleSelectAll}
                    style={{ 
                      display: 'flex', alignItems: 'center', gap: '6px', 
                      cursor: 'pointer', fontSize: '0.95rem', color: 'var(--text-muted)',
                      transition: 'color 0.2s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.color = '#fff'}
                    onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
                  >
                    {selectedIds.size === animes.length && animes.length > 0 ? (
                      <CheckCircle2 size={20} color="#818cf8" fill="rgba(129, 140, 248, 0.2)" />
                    ) : (
                      <Circle size={20} color="rgba(255, 255, 255, 0.3)" />
                    )}
                    <span style={{ fontWeight: 600 }}>全選</span>
                  </div>
                )}
              </div>
              <input 
                type="text" 
                placeholder="搜尋動畫名稱..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="share-search-input"
                style={{ flex: '1', maxWidth: '200px' }}
              />
            </div>
            <hr style={{ border: 'none', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', margin: '12px 0 16px 0' }} />

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

          <div className="share-modal-actions" style={{ display: 'flex', alignItems: 'center', justifyContent: mode !== 'SHEET' ? 'space-between' : 'flex-end', gap: '16px' }}>
            {mode !== 'SHEET' && (
              <div className="share-custom-title-section" style={{ flex: '1', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <label style={{ fontSize: '0.9rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', fontWeight: 600 }}>為你的神作賜名：</label>
                <input 
                  type="text" 
                  value={customTitle} 
                  onChange={e => setCustomTitle(e.target.value)} 
                  className="share-search-input" 
                  style={{ flex: '1', padding: '8px 12px', fontSize: '0.9rem' }}
                  placeholder="在此輸入專屬標題..."
                />
              </div>
            )}
            {mode === 'SHEET' ? (
              <button className="btn-primary" onClick={handleExportSheet} disabled={isProcessing}>
                {isProcessing ? <Loader2 className="animate-spin" size={18} /> : <FileSpreadsheet size={18} />}
                {isProcessing ? '正在建立試算表...' : '建立清單'}
              </button>
            ) : (
              <button className="btn-primary" onClick={handleGenerateImage} disabled={isProcessing || selectedIds.size === 0 || selectedIds.size > requiredCount}>
                {isProcessing ? <Loader2 className="animate-spin" size={18} /> : <Share2 size={18} />}
                {isProcessing ? '處理中...' : '分享'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Hidden Generator for HTML-to-Image */}
      {mode !== 'SHEET' && selectedIds.size > 0 && selectedIds.size <= requiredCount && (
        <ShareImageGenerator 
          ref={imageGeneratorRef}
          animes={selectedAnimes} 
          isWatched={isWatched} 
          gridCount={requiredCount as 4|9|16} 
          customTitle={customTitle}
        />
      )}
    </>,
    document.body
  );
};

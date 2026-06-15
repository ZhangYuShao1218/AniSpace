import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Loader2 } from 'lucide-react';
import { useShareTask } from '@/contexts/ShareTaskContext';
import NoticeModal from '@/components/modals/NoticeModal';
import '@/components/share/ShareProgressPill.css';
import { Capacitor } from '@capacitor/core';

export const ShareProgressPill: React.FC = () => {
  const { isGenerating, status, progress, total, generatedUri, shareResult } = useShareTask();
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isGenerating && status === 'generating_canvas') {
      interval = setInterval(() => {
        setElapsedSeconds(prev => prev + 1);
      }, 1000);
    } else if (!isGenerating) {
      setElapsedSeconds(0);
    }
    return () => clearInterval(interval);
  }, [isGenerating, status]);

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!Capacitor.isNativePlatform()) return null;

  if (!isGenerating && !generatedUri) return null;

  return createPortal(
    <>
      {isGenerating && (
        <div className="share-progress-pill fade-in">
          <Loader2 className="animate-spin" size={16} />
          <span>{status === 'generating_canvas' ? `繪製圖片中 ${formatTime(elapsedSeconds)}` : '載入圖片中...'}</span>
          {status !== 'generating_canvas' && (
            <span className="progress-text">{progress} / {total}</span>
          )}
        </div>
      )}

      <NoticeModal
        isOpen={!!generatedUri}
        onConfirm={shareResult}
        title="產生完成"
        message={
          <p style={{ lineHeight: '1.6', margin: 0, color: 'var(--text-secondary)' }}>
            您的分享圖片已經準備好！<br/>
            點擊下方按鈕以開啟分享面板。
          </p>
        }
        confirmText="立即分享"
      />
    </>,
    document.body
  );
};

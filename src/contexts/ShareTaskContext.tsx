import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';
import { Filesystem, Directory } from '@capacitor/filesystem';
import type { Anime, WatchedAnime } from '@/types';
import { ShareImageGenerator } from '@/components/share/ShareImageGenerator';
import type { ShareImageGeneratorRef } from '@/components/share/ShareImageGenerator';
import { useLanguage } from '@/contexts/LanguageContext';

export interface ShareTaskData {
  animes: (Anime | WatchedAnime)[];
  isWatched: boolean;
  customTitle: string;
  gridCount: 4 | 9 | 16 | 25;
}

interface ShareTaskContextType {
  isGenerating: boolean;
  status: 'idle' | 'loading_images' | 'generating_canvas' | 'done';
  progress: number;
  total: number;
  generatedUri: string | null;
  startTask: (data: ShareTaskData) => void;
  clearResult: () => void;
  shareResult: () => Promise<void>;
}

const ShareTaskContext = createContext<ShareTaskContextType | undefined>(undefined);

export const ShareTaskProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { t } = useLanguage();
  const [taskData, setTaskData] = useState<ShareTaskData | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [status, setStatus] = useState<'idle' | 'loading_images' | 'generating_canvas' | 'done'>('idle');
  const [progress, setProgress] = useState(0);
  const [total, setTotal] = useState(0);
  const [generatedUri, setGeneratedUri] = useState<string | null>(null);
  
  const imageGeneratorRef = useRef<ShareImageGeneratorRef>(null);
  const taskStartedRef = useRef(false);

  const startTask = useCallback((data: ShareTaskData) => {
    setTaskData(data);
    setIsGenerating(true);
    setStatus('loading_images');
    setProgress(0);
    setTotal(data.animes.length);
    setGeneratedUri(null);
    taskStartedRef.current = false; // Reset to allow effect to run
  }, []);

  useEffect(() => {
    if (taskData && isGenerating && !taskStartedRef.current) {
      taskStartedRef.current = true;
      
      const runGeneration = async () => {
        // Wait a tick for ShareImageGenerator to mount and ref to attach
        await new Promise(r => setTimeout(r, 100));
        
        if (!imageGeneratorRef.current) {
          console.error('Image generator ref not attached');
          setIsGenerating(false);
          return;
        }

        try {
          // Tell UI we finished downloading and are starting heavy render
          setStatus('generating_canvas');
          
          const dataUrl = await imageGeneratorRef.current.generateImage();
          const filename = `AniSpace_${taskData.isWatched ? '紀錄' : '期待'}_分享.png`;
          
          if (Capacitor.isNativePlatform()) {
            const base64Data = dataUrl.split(',')[1];
            const savedFile = await Filesystem.writeFile({
              path: filename,
              data: base64Data,
              directory: Directory.Cache
            });
            setGeneratedUri(savedFile.uri);
          } else {
            // Web PC: directly download the image
            const link = document.createElement('a');
            link.download = filename;
            link.href = dataUrl;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            // We intentionally do not set generatedUri on Web so it doesn't trigger the native share UI
          }
        } catch (err) {
          console.error('Background generation failed:', err);
          alert('產生圖片失敗，請稍後再試。');
        } finally {
          setIsGenerating(false);
          setStatus(generatedUri ? 'done' : 'idle');
        }
      };
      
      runGeneration();
    }
  }, [taskData, isGenerating]);

  const clearResult = useCallback(() => {
    setGeneratedUri(null);
    setTaskData(null);
    setStatus('idle');
    setProgress(0);
    setTotal(0);
  }, []);

  const shareResult = useCallback(async () => {
    if (!generatedUri || !taskData) return;
    
    if (Capacitor.isNativePlatform()) {
      try {
        await Share.share({
          title: 'AniSpace 動畫分享',
          text: t('shareTextMsg' as any),
          url: generatedUri,
          dialogTitle: '分享動畫清單'
        });
      } catch (e) {
        console.error(e);
      }
    } else {
      const filename = `AniSpace_${taskData.isWatched ? '紀錄' : '期待'}_分享.png`;
      try {
        const res = await fetch(generatedUri);
        const blob = await res.blob();
        const file = new File([blob], filename, { type: 'image/png' });

        if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: 'AniSpace 動畫分享',
            text: t('shareTextMsg' as any),
            files: [file]
          });
        } else {
          const link = document.createElement('a');
          link.download = filename;
          link.href = generatedUri;
          link.click();
        }
      } catch (shareErr) {
        console.error(shareErr);
        const link = document.createElement('a');
        link.download = filename;
        link.href = generatedUri;
        link.click();
      }
    }
    clearResult();
  }, [generatedUri, taskData, clearResult, t]);

  return (
    <ShareTaskContext.Provider value={{ isGenerating, status, progress, total, generatedUri, startTask, clearResult, shareResult }}>
      {children}
      {taskData && isGenerating && (
        <ShareImageGenerator 
          ref={imageGeneratorRef}
          animes={taskData.animes} 
          isWatched={taskData.isWatched} 
          customTitle={taskData.customTitle}
          gridCount={taskData.gridCount}
          onProgress={(p, t) => { setProgress(p); setTotal(t); }}
        />
      )}
    </ShareTaskContext.Provider>
  );
};

export const useShareTask = () => {
  const context = useContext(ShareTaskContext);
  if (context === undefined) {
    throw new Error('useShareTask must be used within a ShareTaskProvider');
  }
  return context;
};

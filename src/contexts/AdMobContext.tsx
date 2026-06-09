import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { AdMob, BannerAdPluginEvents } from '@capacitor-community/admob';
// import type { BannerAdOptions } from '@capacitor-community/admob';

interface AdMobContextType {
  hideAd: () => void;
  showAd: () => void;
}

const AdMobContext = createContext<AdMobContextType>({
  hideAd: () => { },
  showAd: () => { },
});

export const useAdMob = () => useContext(AdMobContext);

export const AdMobProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isNative] = useState(() => Capacitor.isNativePlatform());
  const isAdInitializedRef = useRef(false);
  const hiddenCountRef = useRef(0);

  useEffect(() => {
    if (!isNative) return;

    let isMounted = true;

    const initAd = async () => {
      try {
        await AdMob.initialize();
        if (!isMounted) return;

        AdMob.addListener(BannerAdPluginEvents.SizeChanged, (info: any) => {
          document.documentElement.style.setProperty('--admob-height', `${info.height}px`);
        });

        // const options: BannerAdOptions = {
        //   adId: 'ca-app-pub-3940256099942544/6300978111', // Test Banner ID
        //   adSize: BannerAdSize.ADAPTIVE_BANNER,
        //   position: BannerAdPosition.BOTTOM_CENTER,
        //   margin: 0,
        //   isTesting: true,
        // };

        // 暫時隱藏廣告以供錄影拍攝
        // await AdMob.showBanner(options);
        isAdInitializedRef.current = true;
        
        // If there are pending hide requests that happened before initialization, hide it now.
        if (hiddenCountRef.current > 0) {
          AdMob.hideBanner().catch(console.error);
        }
      } catch (error) {
        console.error('AdMob initialization error:', error);
      }
    };

    initAd();

    return () => {
      isMounted = false;
      if (isNative) {
        AdMob.removeBanner().catch(err => console.error('Error removing banner:', err));
      }
    };
  }, [isNative]);

  const hideAd = useCallback(() => {
    if (!isNative) return;
    hiddenCountRef.current += 1;
    // 只有在第一個需要隱藏的元件呼叫時，才真的呼叫原生 hideBanner
    if (hiddenCountRef.current === 1 && isAdInitializedRef.current) {
      AdMob.hideBanner().catch(console.error);
    }
  }, [isNative]);

  const showAd = useCallback(() => {
    if (!isNative) return;
    hiddenCountRef.current = Math.max(0, hiddenCountRef.current - 1);
    // 只有當所有要求隱藏的元件都呼叫 showAd 後，才真的恢復顯示
    if (hiddenCountRef.current === 0 && isAdInitializedRef.current) {
      AdMob.resumeBanner().catch(console.error);
    }
  }, [isNative]);

  return (
    <AdMobContext.Provider value={{ hideAd, showAd }}>
      {children}
    </AdMobContext.Provider>
  );
};

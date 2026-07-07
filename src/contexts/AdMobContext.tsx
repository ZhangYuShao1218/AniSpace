import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { AdMob, BannerAdPluginEvents, BannerAdSize, BannerAdPosition } from '@capacitor-community/admob';
import type { BannerAdOptions } from '@capacitor-community/admob';
import { logEvent } from '@/utils/analytics';

interface AdMobContextType {
  hideAd: () => void;
  showAd: () => void;
  showInterstitialSafe: (triggerType: 'review' | 'export' | 'timer_15min') => Promise<boolean>;
}

const AdMobContext = createContext<AdMobContextType>({
  hideAd: () => { },
  showAd: () => { },
  showInterstitialSafe: async () => false,
});

export const useAdMob = () => useContext(AdMobContext);

// 新使用者判斷標準：生成分享圖片 <= 1 且 評論動畫 <= 2
// 一旦非新使用者（生成分享圖片 > 1 或 評論動畫 > 2 或已登入同步過非新使用者旗標），永久判定為非新使用者
const checkIsNotNewUser = (): boolean => {
  if (localStorage.getItem('admob_is_not_new_user') === 'true') {
    return true;
  }
  const exportCount = parseInt(localStorage.getItem('admob_export_count') || '0', 10);
  const reviewCount = parseInt(localStorage.getItem('admob_review_count') || '0', 10);
  if (exportCount > 1 || reviewCount > 2) {
    localStorage.setItem('admob_is_not_new_user', 'true');
    return true;
  }
  return false;
};

const getTriggerEventName = (triggerType: 'review' | 'export' | 'timer_15min'): string => {
  switch (triggerType) {
    case 'export':
      return 'Interstitial_Ads_ShareImage';
    case 'review':
      return 'Interstitial_Ads_ReviewAnime';
    case 'timer_15min':
      return 'Interstitial_Ads_AppUsage';
  }
};

export const AdMobProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isNative] = useState(() => Capacitor.isNativePlatform());
  const isAdInitializedRef = useRef(false);
  const hiddenCountRef = useRef(0);

  const prepareInterstitialAd = useCallback(async () => {
    if (!isNative) return;
    try {
      await AdMob.prepareInterstitial({
        adId: import.meta.env.VITE_ADMOB_INTERSTITIAL_ID || 'ca-app-pub-3940256099942544/1033173712',
        isTesting: import.meta.env.DEV,
      });
    } catch (error) {
      console.error('AdMob prepareInterstitial error:', error);
    }
  }, [isNative]);

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

        const options: BannerAdOptions = {
          adId: import.meta.env.VITE_ADMOB_BANNER_ID || 'ca-app-pub-3940256099942544/6300978111', // Test Banner ID fallback
          adSize: BannerAdSize.ADAPTIVE_BANNER,
          position: BannerAdPosition.BOTTOM_CENTER,
          margin: 0,
          isTesting: import.meta.env.DEV,
        };

        // 顯示廣告
        await AdMob.showBanner(options);
        isAdInitializedRef.current = true;
        
        // 預先準備全版廣告
        prepareInterstitialAd();

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
  }, [isNative, prepareInterstitialAd]);

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

  const showInterstitialSafe = useCallback(async (triggerType: 'review' | 'export' | 'timer_15min'): Promise<boolean> => {
    if (!isNative) return false;

    const eventName = getTriggerEventName(triggerType);

    // 1. 只要曾經評論過及分享圖片，均會記錄次數 (即使刪除評論也會被算在判斷新使用者的次數中)
    if (triggerType === 'review' || triggerType === 'export') {
      const countKey = triggerType === 'review' ? 'admob_review_count' : 'admob_export_count';
      const currentCount = parseInt(localStorage.getItem(countKey) || '0', 10) + 1;
      localStorage.setItem(countKey, currentCount.toString());
    }

    // 2. 判斷是否為「新使用者」(生成分享圖片<=1 且 評論動畫<=2)
    // 新使用者不會觸發任何插頁廣告！
    const isNotNew = checkIsNotNewUser();
    if (!isNotNew) {
      const exportCount = localStorage.getItem('admob_export_count') || '0';
      const reviewCount = localStorage.getItem('admob_review_count') || '0';
      logEvent('AdMob', eventName, `Skipped_NewUser (exp:${exportCount}, rev:${reviewCount})`);
      return false;
    }

    // 3. 檢查 30 分鐘共用冷卻時間 (Cooldown)
    const lastTimeStr = localStorage.getItem('admob_last_interstitial_time');
    const lastTime = lastTimeStr ? parseInt(lastTimeStr, 10) : 0;
    const now = Date.now();
    const cooldownMs = 30 * 60 * 1000; // 30 分鐘

    if (now - lastTime < cooldownMs) {
      const remainsMin = Math.round((cooldownMs - (now - lastTime)) / 60000);
      logEvent('AdMob', eventName, `Skipped_Cooldown (${remainsMin}m left)`);
      return false;
    }

    // 4. 嘗試展示全版廣告
    logEvent('AdMob', eventName, 'Request');
    try {
      await AdMob.showInterstitial();
      localStorage.setItem('admob_last_interstitial_time', Date.now().toString());
      localStorage.setItem('admob_active_seconds_since_cooldown', '0'); // 冷卻結束重新計時 15 分鐘歸零
      logEvent('AdMob', eventName, 'Show_Success');

      // 成功展示後，在背景預先載入下一支廣告
      setTimeout(() => {
        prepareInterstitialAd();
      }, 1000);

      return true;
    } catch (error: any) {
      // 若第一次顯示失敗（可能還沒準備好或過期），嘗試重新載入後再顯示一次
      try {
        await prepareInterstitialAd();
        await AdMob.showInterstitial();
        localStorage.setItem('admob_last_interstitial_time', Date.now().toString());
        localStorage.setItem('admob_active_seconds_since_cooldown', '0');
        logEvent('AdMob', eventName, 'Show_Success_Retry');
        
        setTimeout(() => {
          prepareInterstitialAd();
        }, 1000);

        return true;
      } catch (retryError: any) {
        console.error('Failed to show interstitial ad after retry:', retryError);
        const errorMsg = retryError?.message || String(retryError);
        logEvent('AdMob', eventName, `Show_Failed: ${errorMsg.slice(0, 50)}`);
        return false;
      }
    }
  }, [isNative, prepareInterstitialAd]);

  // 15 分鐘開啟使用計時器（會在冷卻結束後，才再次開始計時 15 分鐘）
  useEffect(() => {
    if (!isNative) return;

    const interval = setInterval(() => {
      // 1. 新使用者不觸發、不計時
      if (!checkIsNotNewUser()) return;

      // 2. 檢查目前是否還在 30 分鐘共用冷卻期內
      const lastTimeStr = localStorage.getItem('admob_last_interstitial_time');
      const lastTime = lastTimeStr ? parseInt(lastTimeStr, 10) : 0;
      const now = Date.now();
      const cooldownMs = 30 * 60 * 1000;

      if (now - lastTime < cooldownMs) {
        // 在冷卻期間，將 15 分鐘使用計時歸零
        localStorage.setItem('admob_active_seconds_since_cooldown', '0');
        return;
      }

      // 3. 冷卻已結束！開始累計使用時間 (每 10 秒累計 10 秒)
      const currentActiveSec = parseInt(localStorage.getItem('admob_active_seconds_since_cooldown') || '0', 10) + 10;
      localStorage.setItem('admob_active_seconds_since_cooldown', currentActiveSec.toString());

      // 4. 判斷是否達到 15 分鐘 (900 秒)
      if (currentActiveSec >= 15 * 60) {
        showInterstitialSafe('timer_15min');
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [isNative, showInterstitialSafe]);

  return (
    <AdMobContext.Provider value={{ hideAd, showAd, showInterstitialSafe }}>
      {children}
    </AdMobContext.Provider>
  );
};



import React, { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import '@/components/layout/AdBanner.css';

interface AdBannerProps {
  adSlot?: string;
  className?: string;
}

const AdBanner: React.FC<AdBannerProps> = ({ adSlot, className = '' }) => {
  const [isNative] = useState(() => Capacitor.isNativePlatform());

  useEffect(() => {
    if (!isNative) {
      // Web AdSense logic
      try {
        if (adSlot) {
          // @ts-ignore
          (window.adsbygoogle = window.adsbygoogle || []).push({});
        }
      } catch (err) {
        console.error('AdSense error:', err);
      }
    }
  }, [isNative, adSlot]);

  if (isNative) {
    // Native AdMob floats over the WebView, so we don't render a DOM element.
    // AdMob is now managed globally in App.tsx / AdMobContext.tsx
    return null;
  }

  return (
    <div className={`ad-banner-container ${className}`}>
      <div className="ad-label">Advertisement</div>
      <div className="ad-content">
        <ins className="adsbygoogle"
             style={{ display: 'block', minHeight: '50px' }}
             data-ad-client="ca-pub-7954604636474942"
             data-ad-slot={adSlot || "3811211519"}
             data-ad-format="auto"
             data-full-width-responsive="true"></ins>
      </div>
    </div>
  );
};

export default AdBanner;

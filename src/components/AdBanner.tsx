import React, { useEffect } from 'react';
import './AdBanner.css';

interface AdBannerProps {
  adSlot?: string;
  className?: string;
}

const AdBanner: React.FC<AdBannerProps> = ({ adSlot, className = '' }) => {
  useEffect(() => {
    try {
      if (adSlot) {
        // @ts-ignore
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      }
    } catch (err) {
      console.error('AdSense error:', err);
    }
  }, [adSlot]);

  return (
    <div className={`ad-banner-container glass-panel ${className}`}>
      <span className="ad-label">Sponsored</span>
      {adSlot ? (
        <ins
          className="adsbygoogle"
          style={{ display: 'block' }}
          data-ad-client="ca-pub-7954604636474942"
          data-ad-slot={adSlot}
          data-ad-format="auto"
          data-full-width-responsive="true"
        />
      ) : (
        <div className="ad-placeholder">
          <p>廣告版位預留區 (Top / Bottom Banner)</p>
          <small>請填入 data-ad-slot 即可顯示 Google AdSense</small>
        </div>
      )}
    </div>
  );
};

export default AdBanner;

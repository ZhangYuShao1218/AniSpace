import React, { useState, useEffect } from 'react';
import { ExternalLink, ShoppingBag } from 'lucide-react';
import '@/components/core/AffiliateCard.css';

interface AffiliateStore {
  id?: string;
  title: string;
  description: string;
  affiliateUrl: string;
  imageUrl?: string;
}

// 如果 fetch 失敗時的備用機制
const FALLBACK_STORES: AffiliateStore[] = [
  {
    title: "MUSE 木棉花官方旗艦店",
    description: "支持正版！各式熱門當季動畫周邊、服飾、福袋都在這。",
    affiliateUrl: "https://s.shopee.tw/1BJuh4hhQC",
    imageUrl: "/affiliates/muse.png"
  }
];

interface AffiliateCardProps {
  title?: string;
  description?: string;
  imageUrl?: string;
  affiliateUrl?: string;
}

const AffiliateCard: React.FC<AffiliateCardProps> = ({
  title,
  description,
  imageUrl,
  affiliateUrl
}) => {
  const [store, setStore] = useState<AffiliateStore | null>(null);

  useEffect(() => {
    // 只有在沒有強制傳入 props 的情況下才隨機抽卡
    if (!title || !affiliateUrl) {
      fetch('/affiliates.json')
        .then(res => {
          if (!res.ok) throw new Error('Failed to fetch affiliates.json');
          return res.json();
        })
        .then((data: AffiliateStore[]) => {
          const storesToUse = data.length > 0 ? data : FALLBACK_STORES;
          const randomIndex = Math.floor(Math.random() * storesToUse.length);
          setStore(storesToUse[randomIndex]);
        })
        .catch(err => {
          console.error("無法載入最新的分潤名單，使用備用選項:", err);
          setStore(FALLBACK_STORES[0]);
        });
    }
  }, [title, affiliateUrl]);

  const displayTitle = title || store?.title || "推薦動漫周邊";
  const displayDesc = description || store?.description || "點擊前往查看最新優惠！";
  const displayUrl = affiliateUrl || store?.affiliateUrl || "#";
  const displayImage = imageUrl || store?.imageUrl;

  return (
    <a 
      href={displayUrl} 
      target="_blank" 
      rel="noopener noreferrer" 
      className="affiliate-card anime-card" 
    >
      <div className="affiliate-image-container anime-image-container">
        {displayImage ? (
          <img src={displayImage} alt={displayTitle} className="anime-image" loading="lazy" />
        ) : (
          <div className="affiliate-placeholder-image" style={{ background: 'linear-gradient(135deg, var(--bg-card-hover), var(--bg-card))', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <span className="ad-label">Sponsored</span>
            <ShoppingBag size={48} style={{ color: 'var(--accent-color)', marginBottom: '12px', opacity: 0.8 }} />
            <div className="placeholder-content">
              <span style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--text-primary)' }}>蝦皮購物 x 動漫特賣</span>
            </div>
          </div>
        )}
        <div className="anime-overlay">
          <div className="anime-overlay-content">
            <span className="action-button primary" style={{ width: 'auto', padding: '8px 16px' }}>
              前往查看 <ExternalLink size={16} style={{ marginLeft: '6px' }} />
            </span>
          </div>
        </div>
      </div>
      <div className="anime-info" style={{ padding: '12px' }}>
        <h3 className="anime-title" style={{ color: 'var(--accent-color)', fontSize: '1rem' }}>{displayTitle}</h3>
        <p className="affiliate-desc">{displayDesc}</p>
      </div>
    </a>
  );
};

export default AffiliateCard;

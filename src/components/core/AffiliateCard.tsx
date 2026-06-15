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

interface ProductImage {
  url: string;
  productName: string;
  category?: string;
}

const AffiliateCard: React.FC<AffiliateCardProps> = ({
  title,
  description,
  imageUrl,
  affiliateUrl
}) => {
  const [store, setStore] = useState<AffiliateStore | null>(null);
  const [product, setProduct] = useState<ProductImage | null>(null);

  useEffect(() => {
    // 只有在沒有強制傳入 props 的情況下才隨機抽卡
    if (!title || !affiliateUrl) {
      // 抓取商店與圖片
      Promise.all([
        fetch('/affiliates.json').then(res => res.json()),
        fetch('/product_images.json').then(res => res.json()).catch(() => [])
      ])
      .then(([stores, products]) => {
        const storesToUse = stores.length > 0 ? stores : FALLBACK_STORES;
        const randomStore = storesToUse[Math.floor(Math.random() * storesToUse.length)];
        setStore(randomStore);

        if (products && products.length > 0) {
          const randomProduct = products[Math.floor(Math.random() * products.length)];
          setProduct(randomProduct);
        }
      })
      .catch(err => {
        console.error("無法載入最新的分潤名單，使用備用選項:", err);
        setStore(FALLBACK_STORES[0]);
      });
    }
  }, [title, affiliateUrl]);

  const displayTitle = title || store?.title || "推薦動漫周邊";
  const displayDesc = product?.productName || description || store?.description || "點擊前往查看最新優惠！";
  const displayUrl = affiliateUrl || store?.affiliateUrl || "#";
  const displayImage = imageUrl || product?.url || store?.imageUrl;

  return (
    <a 
      href={displayUrl} 
      target="_blank" 
      rel="noopener noreferrer" 
      className="recommend-card anime-card" 
    >
      <div className="recommend-image-container anime-image-container">
        {/* Dynamic Sponsor Badge */}
        <span className="store-badge" style={{ position: 'absolute', top: 8, left: 8, background: 'rgba(16, 185, 129, 0.9)', color: 'white', fontWeight: 600, padding: '4px 8px', borderRadius: '4px', zIndex: 10, fontSize: '0.75rem', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>
          {displayTitle}
        </span>
        
        {displayImage ? (
          <img src={displayImage} alt={displayTitle} className="anime-image" loading="lazy" />
        ) : (
          <div className="recommend-placeholder-image" style={{ background: 'linear-gradient(135deg, var(--bg-card-hover), var(--bg-card))', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
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
      <div className="anime-info" style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
        <h3 className="anime-title" style={{ color: 'var(--text-primary)', fontSize: '0.95rem', lineHeight: '1.4', marginBottom: '8px' }}>
          {displayDesc}
        </h3>
        {store?.description && (
          <p className="recommend-desc" style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '12px', lineHeight: '1.5' }}>
            {store.description}
          </p>
        )}
        <div style={{ marginTop: 'auto', paddingTop: '4px' }}>
          <p className="recommend-desc" style={{ color: 'var(--accent-color)', fontWeight: 600, fontSize: '0.9rem', margin: 0 }}>
            馬上前往選購 →
          </p>
        </div>
      </div>
    </a>
  );
};

export default AffiliateCard;

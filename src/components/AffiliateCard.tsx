import React from 'react';
import { ExternalLink } from 'lucide-react';
import './AffiliateCard.css';

interface AffiliateCardProps {
  title?: string;
  description?: string;
  imageUrl?: string;
  affiliateUrl?: string;
}

const AffiliateCard: React.FC<AffiliateCardProps> = ({
  title = "特別推薦：精選動漫周邊",
  description = "點擊前往博客來 / Play-Asia 查看最新優惠！",
  imageUrl,
  affiliateUrl = "#"
}) => {
  return (
    <a 
      href={affiliateUrl} 
      target="_blank" 
      rel="noopener noreferrer" 
      className="affiliate-card anime-card" 
    >
      <div className="affiliate-image-container anime-image-container">
        {imageUrl ? (
          <img src={imageUrl} alt={title} className="anime-image" loading="lazy" />
        ) : (
          <div className="affiliate-placeholder-image">
            <span className="ad-label">Sponsored</span>
            <div className="placeholder-content">
              <span>聯盟行銷</span>
              <span>圖片佔位區</span>
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
        <h3 className="anime-title" style={{ color: 'var(--accent-color)', fontSize: '1rem' }}>{title}</h3>
        <p className="affiliate-desc">{description}</p>
      </div>
    </a>
  );
};

export default AffiliateCard;

import React, { useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Film, Clock, CheckCircle2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useScrollDirection } from '@/hooks/useScrollDirection';
import { useAdMob } from '@/contexts/AdMobContext';
import SettingsDropdown from '@/components/SettingsDropdown';
import '@/components/layout/BottomNavBar.css';

const BottomNavBar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname;
  const { t } = useLanguage();
  const { scrollDirection } = useScrollDirection(currentPath);
  const { hideAd, showAd } = useAdMob();

  // 用於破解手機端「慣性滾動中點擊會被系統沒收」的 Bug
  const touchStartX = React.useRef(0);
  const touchStartY = React.useRef(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent, path: string) => {
    const endX = e.changedTouches[0].clientX;
    const endY = e.changedTouches[0].clientY;
    const distance = Math.sqrt(Math.pow(endX - touchStartX.current, 2) + Math.pow(endY - touchStartY.current, 2));

    // 如果滑動距離小於 10px，視為點擊
    if (distance < 10) {
      e.preventDefault(); // 阻止原生的 click 事件，避免重複觸發
      if (currentPath !== path) {
        navigate(path);
      }
    }
  };

  const isHidden = scrollDirection === 'down';

  useEffect(() => {
    if (!isHidden) {
      hideAd(); // Hide ad when BottomNav is visible
      return () => showAd(); // Show ad when BottomNav is hidden (scrolled down) or unmounted
    }
  }, [isHidden, hideAd, showAd]);

  return (
    <>
      <div className={`bottom-nav-bar glass-panel ${isHidden ? 'hidden' : ''}`}>
        <Link 
          to="/" 
          className={`bottom-nav-item ${currentPath === '/' ? 'active' : ''}`}
          onTouchStart={handleTouchStart}
          onTouchEnd={(e) => handleTouchEnd(e, '/')}
        >
          <Film className="bottom-nav-icon" />
          <span className="bottom-nav-label">{t('navAllAnime') || '所有動畫'}</span>
        </Link>
        <Link 
          to="/plan" 
          className={`bottom-nav-item ${currentPath === '/plan' ? 'active' : ''}`}
          onTouchStart={handleTouchStart}
          onTouchEnd={(e) => handleTouchEnd(e, '/plan')}
        >
          <Clock className="bottom-nav-icon" />
          <span className="bottom-nav-label">{t('navPlanToWatch') || '期待動畫'}</span>
        </Link>
        <Link 
          to="/records" 
          className={`bottom-nav-item ${currentPath === '/records' ? 'active' : ''}`}
          onTouchStart={handleTouchStart}
          onTouchEnd={(e) => handleTouchEnd(e, '/records')}
        >
          <CheckCircle2 className="bottom-nav-icon" />
          <span className="bottom-nav-label">{t('navRecords') || '動畫紀錄'}</span>
        </Link>
        
        {/* Settings Dropdown as the 4th item */}
        <div className="bottom-nav-item settings-item-wrapper">
          <SettingsDropdown useSettingsIcon={true} />
        </div>
      </div>
      <div className={`ad-black-backdrop ${isHidden ? 'show' : ''}`} />
    </>
  );
};

export default BottomNavBar;

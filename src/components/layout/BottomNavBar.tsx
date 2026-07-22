import React, { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Film, Clock, CheckCircle2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useScrollDirection } from '@/hooks/useScrollDirection';
import { useAdMob } from '@/contexts/AdMobContext';
import SettingsDropdown from '@/components/SettingsDropdown';
import '@/components/layout/BottomNavBar.css';

const BottomNavBar: React.FC = () => {
  const location = useLocation();
  const currentPath = location.pathname;
  const { t } = useLanguage();
  const { scrollDirection } = useScrollDirection(currentPath);
  const { hideAd, showAd } = useAdMob();

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
        <Link to="/" className={`bottom-nav-item ${currentPath === '/' ? 'active' : ''}`}>
          <Film className="bottom-nav-icon" />
          <span className="bottom-nav-label">{t('navAllAnime') || '所有動畫'}</span>
        </Link>
        <Link to="/plan" className={`bottom-nav-item ${currentPath === '/plan' ? 'active' : ''}`}>
          <Clock className="bottom-nav-icon" />
          <span className="bottom-nav-label">{t('navPlanToWatch') || '期待動畫'}</span>
        </Link>
        <Link to="/records" className={`bottom-nav-item ${currentPath === '/records' ? 'active' : ''}`}>
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

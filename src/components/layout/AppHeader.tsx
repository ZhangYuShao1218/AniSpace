import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { Layers, Download, Loader2, Menu, Clock } from 'lucide-react';

import { useAnime } from '@/contexts/AnimeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAdMob } from '@/contexts/AdMobContext';
import GoogleSyncButton from '@/components/core/GoogleSyncButton';
import ImportExportButtons from '@/components/share/ImportExportButtons';

const AppHeader: React.FC = () => {
  const isNative = Capacitor.isNativePlatform();
  const {
    handleSync,
    isScraping,
    scrapeProgress,
    lastSyncTimeFormatted
  } = useAnime();
  
  const { t } = useLanguage();

  const location = useLocation();
  const currentPath = location.pathname;
  const navigate = useNavigate();

  const [isNavOpen, setIsNavOpen] = useState(false);
  const navRef = useRef<HTMLDivElement>(null);
  const { hideAd, showAd } = useAdMob();
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(event.target as Node)) {
        setIsNavOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isNavOpen) {
      hideAd();
      return () => showAd();
    }
  }, [isNavOpen, hideAd, showAd]);

  return (
    <header className="app-header container">
      <div className="header-left">
        <Link to="/" style={{ textDecoration: 'none', color: 'inherit' }}>
          <h1 className="app-title"><Layers className="header-icon" /> {t('appTitle')}</h1>
        </Link>
        <p className="subtitle" style={{ 
          letterSpacing: '0.1em', 
          fontStyle: 'italic', 
          fontWeight: '500',
          opacity: 0.8
        }}>{t('appSubtitle')}</p>
      </div>

      <div className="header-right">
        {!isNative && (
          <div className="header-nav-group">
            <GoogleSyncButton />
            {/* Desktop Nav Tabs (區塊 3) */}
            <div className="nav-tabs desktop-nav-tabs">
              <Link
                to="/"
                className={`nav-tab ${currentPath === '/' ? 'active' : ''}`}
              >
                {t('navAllAnime')}
              </Link>
              <Link
                to="/plan"
                className={`nav-tab ${currentPath === '/plan' ? 'active' : ''}`}
              >
                {t('navPlanToWatch')}
              </Link>
              <Link
                to="/records"
                className={`nav-tab ${currentPath === '/records' ? 'active' : ''}`}
              >
                {t('navRecords')}
              </Link>
            </div>

            {/* Mobile Nav Select (區塊 3) */}
            <div className="mobile-nav-select-wrapper" ref={navRef} style={{ position: 'relative' }}>
              <button 
                className="btn-glass settings-btn"
                onClick={() => setIsNavOpen(!isNavOpen)}
                style={{ width: '100%', height: '100%', padding: '0 12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              >
                <Menu size={16} />
                <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                  {currentPath === '/' ? t('navAllAnime') : currentPath === '/plan' ? t('navPlanToWatch') : t('navRecords')}
                </span>
              </button>
              {isNavOpen && (
                <div className="settings-dropdown-menu fade-in" style={{
                  background: 'var(--bg-dropdown)',
                  backdropFilter: 'blur(12px)',
                  WebkitBackdropFilter: 'blur(12px)',
                  border: '1px solid var(--border-glass-light)',
                  boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)',
                  left: 0,
                  right: 0,
                  top: '110%'
                }}>
                  <button className={`dropdown-item ${currentPath === '/' ? 'active' : ''}`} onClick={() => { navigate('/'); setIsNavOpen(false); }}>{t('navAllAnime')}</button>
                  <button className={`dropdown-item ${currentPath === '/plan' ? 'active' : ''}`} onClick={() => { navigate('/plan'); setIsNavOpen(false); }}>{t('navPlanToWatch')}</button>
                  <button className={`dropdown-item ${currentPath === '/records' ? 'active' : ''}`} onClick={() => { navigate('/records'); setIsNavOpen(false); }}>{t('navRecords')}</button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Header controls (Sync Latest, Import/Export) are kept visible in Native mode */}
        <div className="header-controls" style={isNative ? { display: 'flex', flexWrap: 'wrap', gap: '8px', width: '100%', justifyContent: 'center' } : {}}>
          {isNative && (
            <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
              <div style={{ flex: 1 }}>
                <GoogleSyncButton />
              </div>
              <div className="sync-latest-wrapper" style={{ position: 'relative', display: 'flex', flex: 1, height: '38px' }}>
                <button
                  className="btn-glass sync-latest-btn"
                  onClick={handleSync}
                  disabled={isScraping}
                  style={{ width: '100%', height: '100%', justifyContent: 'center' }}
                >
                  {isScraping ? <Loader2 className="animate-spin" size={16} /> : <Download size={16} />}
                  <span className="btn-text" style={{ display: 'inline-block' }}>{isScraping && scrapeProgress ? t(scrapeProgress as any) : t('syncLatestAnime')}</span>
                </button>
                {lastSyncTimeFormatted && (
                  <span className="sync-time-text" style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'center' }}>
                    <Clock size={12} />
                    {lastSyncTimeFormatted}
                  </span>
                )}
              </div>
            </div>
          )}
          
          {!isNative && (
            <div className="sync-latest-wrapper" style={{ position: 'relative', display: 'flex' }}>
              <button
                className="btn-glass sync-latest-btn"
                onClick={handleSync}
                disabled={isScraping}
              >
                {isScraping ? <Loader2 className="animate-spin" size={16} /> : <Download size={16} />}
                <span className="btn-text">{isScraping && scrapeProgress ? t(scrapeProgress as any) : t('syncLatestAnime')}</span>
              </button>
              {lastSyncTimeFormatted && (
                <span className="sync-time-text" style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'center' }}>
                  <Clock size={12} />
                  {lastSyncTimeFormatted}
                </span>
              )}
            </div>
          )}

          <ImportExportButtons />
        </div>
      </div>
    </header>
  );
};

export default AppHeader;

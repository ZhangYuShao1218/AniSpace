import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Layers, DownloadCloud, Loader2 } from 'lucide-react';
import { useAnime } from '../contexts/AnimeContext';
import GoogleSyncButton from './GoogleSyncButton';
import ImportExportButtons from './ImportExportButtons';

const AppHeader: React.FC = () => {
  const {
    handleSync,
    isScraping,
    scrapeProgress
  } = useAnime();

  const location = useLocation();
  const currentPath = location.pathname;

  return (
    <header className="app-header container">
      <div className="header-left">
        <Link to="/" style={{ textDecoration: 'none', color: 'inherit' }}>
          <h1 className="app-title"><Layers className="header-icon" /> AniSpace 動畫庫</h1>
        </Link>
        <p className="subtitle" style={{ 
          letterSpacing: '0.1em', 
          fontStyle: 'italic', 
          fontWeight: '500',
          opacity: 0.8
        }}>— 為您記錄每一場感動 —</p>
      </div>

      <div className="header-right">
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <GoogleSyncButton />
          <div className="nav-tabs">
            <Link
              to="/"
              className={`nav-tab ${currentPath === '/' ? 'active' : ''}`}
            >
              所有動畫
            </Link>
            <Link
              to="/plan"
              className={`nav-tab ${currentPath === '/plan' ? 'active' : ''}`}
            >
              期待動畫
            </Link>
            <Link
              to="/records"
              className={`nav-tab ${currentPath === '/records' ? 'active' : ''}`}
            >
              動畫紀錄
            </Link>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button
            className="btn-glass settings-btn"
            onClick={handleSync}
            disabled={isScraping}
            style={{ fontSize: '0.85rem', padding: 'var(--spacing-2) var(--spacing-4)' }}
          >
            {isScraping ? <Loader2 className="animate-spin" size={16} /> : <DownloadCloud size={16} />}
            {isScraping ? scrapeProgress : '同步最新動畫'}
          </button>
          <ImportExportButtons />
        </div>
      </div>
    </header>
  );
};

export default AppHeader;

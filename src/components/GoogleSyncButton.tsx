import React from 'react';
import './GoogleSyncButton.css';
import { CloudUpload, Loader2, LogOut } from 'lucide-react';
import { useGoogleSync } from '../contexts/GoogleSyncContext';

const GoogleIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

const GoogleSyncButton: React.FC = () => {
  const { 
    isLoggedIn, 
    isSyncing, 
    lastSyncTime, 
    login, 
    logout, 
    syncToDrive 
  } = useGoogleSync();

  if (!isLoggedIn) {
    return (
      <button 
        className="btn-google" 
        onClick={() => login()}
        disabled={isSyncing}
        title="登入 Google 帳號並將資料備份到雲端硬碟隱藏資料夾"
      >
        {isSyncing ? <Loader2 size={16} className="animate-spin" /> : <GoogleIcon />}
        登入以繼續雲端備份
      </button>
    );
  }

  return (
    <div className="google-sync-btn-container" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <div style={{ position: 'relative' }}>
        <button 
          className="btn-google" 
          onClick={syncToDrive}
          disabled={isSyncing}
          style={{ background: 'rgba(46, 204, 113, 0.15)', borderColor: 'rgba(46, 204, 113, 0.3)' }}
        >
          {isSyncing ? <Loader2 size={16} className="animate-spin" /> : <CloudUpload size={16} />}
          {isSyncing ? '同步中...' : '同步至雲端'}
        </button>
        {lastSyncTime && (
          <span className="sync-time-text" style={{ position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)', marginTop: '4px', whiteSpace: 'nowrap' }}>
            上次同步: {lastSyncTime}
          </span>
        )}
      </div>
      <button 
        className="logout-icon-btn" 
        onClick={logout}
        title="登出 Google 帳號"
      >
        <LogOut size={16} />
      </button>
    </div>
  );
};

export default GoogleSyncButton;

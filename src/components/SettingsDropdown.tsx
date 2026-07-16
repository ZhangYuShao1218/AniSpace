import React, { useRef, useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { Menu, Settings, Trash2, AlertTriangle, Check, Upload, Download, HelpCircle } from 'lucide-react';
import ThemeToggle from '@/components/core/ThemeToggle';
import ConfirmModal from '@/components/modals/ConfirmModal';
import { useGoogleSync } from '@/contexts/GoogleSyncContext';
import { useAdMob } from '@/contexts/AdMobContext';
import { useAnime } from '@/contexts/AnimeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useDataManagement } from '@/hooks/useDataManagement';
import { logEvent } from '@/utils/analytics';
import { APP_VERSION } from '@/utils/version';

interface SettingsDropdownProps {
  useSettingsIcon?: boolean;
}

const SettingsDropdown: React.FC<SettingsDropdownProps> = ({ useSettingsIcon = false }) => {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isClearRecordsModalOpen, setIsClearRecordsModalOpen] = useState(false);
  const [isClearAllModalOpen, setIsClearAllModalOpen] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);
  
  const { isAutoSyncEnabled, toggleAutoSync } = useGoogleSync();
  const { hideAd, showAd } = useAdMob();
  const { handleClearRecords, handleClearAllData, dataVersion } = useAnime();
  const { language, setLanguage, t } = useLanguage();
  const { fileInputRef, handleExport, handleImportFile, isExportDisabled } = useDataManagement();
  const isNative = Capacitor.isNativePlatform();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
        setIsSettingsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!isSettingsOpen) return;
    
    const initialScrollY = window.pageYOffset;
    const handleScroll = () => {
      if (Math.abs(window.pageYOffset - initialScrollY) > 20) {
        setIsSettingsOpen(false);
      }
    };
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isSettingsOpen]);

  useEffect(() => {
    if (isSettingsOpen || isClearRecordsModalOpen || isClearAllModalOpen) {
      hideAd();
      return () => showAd();
    }
  }, [isSettingsOpen, isClearRecordsModalOpen, isClearAllModalOpen, hideAd, showAd]);

  return (
    <div className="settings-dropdown-container" ref={settingsRef}>
      <button 
        className="btn-glass settings-btn" 
        onClick={() => setIsSettingsOpen(!isSettingsOpen)} 
        title={t('settings')}
      >
        {useSettingsIcon ? <Settings size={24} className="bottom-nav-icon" /> : <Menu size={18} />}
        <span className="btn-text">{t('settings')}</span>
      </button>
      
      {isSettingsOpen && (
        <div className="settings-dropdown-menu fade-in" style={{
          background: 'var(--bg-dropdown)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: '1px solid var(--border-glass-light)',
          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)',
        }}>
          <ThemeToggle />
          
          <div style={{ height: '1px', background: 'var(--border-glass-light)', margin: '4px 6px' }} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '6px', padding: '0 10px', marginBottom: '4px' }}>
            <span style={{ fontSize: '0.95rem', color: 'var(--text-primary)', fontWeight: 500, letterSpacing: '0.02em' }}>{t('autoBackup')}</span>
            <label style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer', position: 'relative' }}>
              <input 
                type="checkbox" 
                checked={isAutoSyncEnabled} 
                onChange={toggleAutoSync}
                style={{ opacity: 0, position: 'absolute', width: '100%', height: '100%', cursor: 'pointer', zIndex: 2, margin: 0 }}
              />
              <div style={{
                width: '38px',
                height: '22px',
                backgroundColor: isAutoSyncEnabled ? 'var(--accent-color)' : 'rgba(255,255,255,0.1)',
                borderRadius: '20px',
                position: 'relative',
                transition: 'background-color 0.3s',
                border: '1px solid var(--border-glass-light)'
              }}>
                <div style={{
                  width: '16px',
                  height: '16px',
                  backgroundColor: 'white',
                  borderRadius: '50%',
                  position: 'absolute',
                  top: '2px',
                  left: isAutoSyncEnabled ? '18px' : '2px',
                  transition: 'left 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.3)'
                }}></div>
              </div>
            </label>
          </div>

          <>
            <div style={{ height: '1px', background: 'var(--border-glass-light)', margin: '4px 6px' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px', padding: '4px 10px', color: 'var(--text-secondary)' }}>
              <span style={{ fontSize: '0.9rem', fontWeight: 500, letterSpacing: '0.02em' }}>🌐 Language</span>
            </div>
            <button className="dropdown-item lang-item" onClick={() => setLanguage('zh-TW')} style={{ fontSize: '0.85rem' }}>
              <span style={{ width: '20px', display: 'inline-flex', justifyContent: 'center' }}>{language === 'zh-TW' && <Check size={14} color="var(--accent-color)" />}</span>
              繁體中文
            </button>
            <button className="dropdown-item lang-item" onClick={() => setLanguage('en')} style={{ fontSize: '0.85rem' }}>
              <span style={{ width: '20px', display: 'inline-flex', justifyContent: 'center' }}>{language === 'en' && <Check size={14} color="var(--accent-color)" />}</span>
              English
            </button>
            <button className="dropdown-item lang-item" onClick={() => setLanguage('ja')} style={{ fontSize: '0.85rem' }}>
              <span style={{ width: '20px', display: 'inline-flex', justifyContent: 'center' }}>{language === 'ja' && <Check size={14} color="var(--accent-color)" />}</span>
              日本語
            </button>
            <div style={{ height: '1px', background: 'var(--border-glass-light)', margin: '4px 6px' }} />
            
            <>
              <input
                type="file"
                accept=".csv,text/csv,application/vnd.ms-excel,text/plain,*/*"
                ref={fileInputRef}
                onChange={(e) => {
                  handleImportFile(e);
                  setIsSettingsOpen(false);
                }}
                style={{ display: 'none' }}
              />
              <button 
                className="dropdown-item" 
                onClick={() => {
                  fileInputRef.current?.click();
                  setIsSettingsOpen(false); // Close dropdown when clicked
                }} 
                style={{ fontSize: '0.9rem', color: 'var(--accent-color)', letterSpacing: '0.02em', whiteSpace: 'nowrap' }}
              >
                <Upload size={16} style={{ color: 'var(--accent-color)' }} />
                {t('importData')}
              </button>
              <button 
                className="dropdown-item" 
                onClick={() => {
                  handleExport();
                  logEvent('Data_Export', 'Export_CSV', 'Local_Backup');
                  setIsSettingsOpen(false); // Close dropdown when clicked
                }} 
                disabled={isExportDisabled}
                style={{ fontSize: '0.9rem', color: '#059669', letterSpacing: '0.02em', whiteSpace: 'nowrap', opacity: isExportDisabled ? 0.5 : 1 }}
              >
                <Download size={16} style={{ color: '#059669' }} />
                {t('localBackup')}
              </button>
              <div style={{ height: '1px', background: 'var(--border-glass-light)', margin: '4px 6px' }} />
            </>

            {!isNative ? (
              <>
                <button 
                  className="dropdown-item" 
                  onClick={() => {
                    window.open('https://play.google.com/store/apps/details?id=com.zhangyushao.anispace', '_blank');
                    setIsSettingsOpen(false);
                  }} 
                  style={{ fontSize: '0.9rem', color: 'var(--text-primary)', letterSpacing: '0.02em', whiteSpace: 'nowrap' }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 256 283">
                    <path fill="#ea4335" d="M119.553 134.916L1.06 259.061a32.14 32.14 0 0 0 47.062 19.071l133.327-75.934z"/>
                    <path fill="#fbbc04" d="M239.37 113.814L181.715 80.79l-64.898 56.95l65.162 64.28l57.216-32.67a31.345 31.345 0 0 0 0-55.537z"/>
                    <path fill="#4285f4" d="M1.06 23.487A30.6 30.6 0 0 0 0 31.61v219.327a32.3 32.3 0 0 0 1.06 8.124l122.555-120.966z"/>
                    <path fill="#34a853" d="m120.436 141.274l61.278-60.483L48.564 4.503A32.85 32.85 0 0 0 32.051 0C17.644-.028 4.978 9.534 1.06 23.399z"/>
                  </svg>
                  Google Play
                </button>
                <div style={{ height: '1px', background: 'var(--border-glass-light)', margin: '4px 6px' }} />
              </>
            ) : (
              <>
                <button 
                  className="dropdown-item" 
                  onClick={() => {
                    window.open('https://anispace.zhangyushao.dev/', '_blank');
                    setIsSettingsOpen(false);
                  }} 
                  style={{ fontSize: '0.9rem', color: 'var(--text-primary)', letterSpacing: '0.02em', whiteSpace: 'nowrap' }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#3b82f6' }}>
                    <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                    <line x1="8" y1="21" x2="16" y2="21"></line>
                    <line x1="12" y1="17" x2="12" y2="21"></line>
                  </svg>
                  {t('websiteVersion')}
                </button>
                <div style={{ height: '1px', background: 'var(--border-glass-light)', margin: '4px 6px' }} />
              </>
            )}

            <button 
              className="dropdown-item" 
              onClick={() => {
                window.dispatchEvent(new CustomEvent('open-tutorial'));
                setIsSettingsOpen(false);
              }} 
              style={{ fontSize: '0.95rem', fontWeight: 500, color: 'var(--text-primary)', letterSpacing: '0.02em', whiteSpace: 'nowrap' }}
            >
              <HelpCircle size={16} />
              {t('tutorialHelp')}
            </button>

            <button 
              className="dropdown-item danger-item" 
              style={{ fontSize: '0.95rem', fontWeight: 500, letterSpacing: '0.02em', whiteSpace: 'nowrap' }}
              onClick={() => { setIsClearRecordsModalOpen(true); setIsSettingsOpen(false); }}
            >
              <Trash2 size={16} className="danger-icon" />
              {t('clearRecords')}
            </button>
            <button 
              className="dropdown-item danger-item" 
              style={{ fontSize: '0.95rem', fontWeight: 500, letterSpacing: '0.02em', whiteSpace: 'nowrap' }}
              onClick={() => { setIsClearAllModalOpen(true); setIsSettingsOpen(false); }}
            >
              <AlertTriangle size={16} className="danger-icon" />
              {t('clearAllData')}
            </button>
            <div style={{ height: '1px', background: 'var(--border-glass-light)', margin: '4px 6px' }} />
            <div 
              style={{ 
                display: 'flex',
                alignItems: 'baseline',
                justifyContent: 'center',
                gap: '6px',
                width: '100%',
                padding: '3px 10px',
                whiteSpace: 'nowrap',
                userSelect: 'none'
              }}
            >
              <span style={{ fontSize: '0.9rem', color: 'var(--text-primary)', letterSpacing: '0.05em', fontWeight: 500 }}>
                v{APP_VERSION}
              </span>
              {dataVersion !== null && (
                <>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>-</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 400 }}>
                    ({String(dataVersion).padStart(5, '0')})
                  </span>
                </>
              )}
            </div>
          </>
        </div>
      )}

      <ConfirmModal
        isOpen={isClearRecordsModalOpen}
        onClose={() => setIsClearRecordsModalOpen(false)}
        onConfirm={() => {
          handleClearRecords();
          setIsSettingsOpen(false);
        }}
        title={t('clearRecords')}
        message={
          <>
            <p>{t('confirmClearRecordsDesc')}</p>
            <ul className="confirm-list">
              <li>{t('navRecords')}</li>
              <li>{t('navPlanToWatch')}</li>
            </ul>
            <p>{t('confirmClearRecordsNote')}</p>
          </>
        }
      />
      <ConfirmModal
        isOpen={isClearAllModalOpen}
        onClose={() => setIsClearAllModalOpen(false)}
        onConfirm={() => {
          handleClearAllData();
          setIsSettingsOpen(false);
        }}
        title={t('clearAllData')}
        message={
          <>
            <p>{t('confirmClearAllDataDesc')}</p>
            <ul className="confirm-list">
              <li>{t('navRecords')}</li>
              <li>{t('navPlanToWatch')}</li>
              <li>{t('customAnimes')}</li>
              <li>{t('customAnimeNames')}</li>
            </ul>
            <p>{t('confirmClearAllDataNote')}</p>
          </>
        }
      />
    </div>
  );
};

export default SettingsDropdown;

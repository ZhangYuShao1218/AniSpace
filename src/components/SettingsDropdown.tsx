import React, { useRef, useState, useEffect } from 'react';
/* Removed unused Capacitor import */
import { Menu, Settings, Trash2, AlertTriangle, Check, Upload, Download } from 'lucide-react';
import ThemeToggle from './ThemeToggle';
import ConfirmModal from './ConfirmModal';
import { useGoogleSync } from '../contexts/GoogleSyncContext';
import { useAdMob } from '../contexts/AdMobContext';
import { useAnime } from '../contexts/AnimeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useDataManagement } from '../hooks/useDataManagement';

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
  const { handleClearRecords, handleClearAllData } = useAnime();
  const { language, setLanguage, t } = useLanguage();
  const { fileInputRef, handleExport, handleImportFile, isExportDisabled } = useDataManagement();

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

            <button 
              className="dropdown-item danger-item" 
              style={{ fontSize: '0.95rem', fontWeight: 500, letterSpacing: '0.02em', whiteSpace: 'nowrap' }}
              onClick={() => setIsClearRecordsModalOpen(true)}
            >
              <Trash2 size={16} className="danger-icon" />
              {t('clearRecords')}
            </button>
            <button 
              className="dropdown-item danger-item" 
              style={{ fontSize: '0.95rem', fontWeight: 500, letterSpacing: '0.02em', whiteSpace: 'nowrap' }}
              onClick={() => setIsClearAllModalOpen(true)}
            >
              <AlertTriangle size={16} className="danger-icon" />
              {t('clearAllData')}
            </button>
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

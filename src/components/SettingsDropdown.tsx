import React, { useRef, useState, useEffect } from 'react';
import { Menu, Trash2, AlertTriangle } from 'lucide-react';
import ThemeToggle from './ThemeToggle';
import ConfirmModal from './ConfirmModal';
import { useGoogleSync } from '../contexts/GoogleSyncContext';
import { useAnime } from '../contexts/AnimeContext';

const SettingsDropdown: React.FC = () => {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);
  
  const { isAutoSyncEnabled, toggleAutoSync } = useGoogleSync();
  const { handleClearRecords, handleClearAllData } = useAnime();
  
  const [isClearRecordsModalOpen, setIsClearRecordsModalOpen] = useState(false);
  const [isClearAllModalOpen, setIsClearAllModalOpen] = useState(false);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
        setIsSettingsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="settings-dropdown-container" ref={settingsRef}>
      <button 
        className="btn-glass settings-btn" 
        onClick={() => setIsSettingsOpen(!isSettingsOpen)} 
        title="設定"
      >
        <Menu size={18} />
        <span className="btn-text">設定</span>
      </button>
      
      {isSettingsOpen && (
        <div className="settings-dropdown-menu fade-in glass-panel">
          <ThemeToggle />
          
          <>
            <div style={{ height: '1px', background: 'var(--border-glass-light)', margin: '4px 6px' }} />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '6px', padding: '0 10px', marginBottom: '4px' }}>
              <span style={{ fontSize: '0.95rem', color: 'var(--text-primary)', fontWeight: 500, letterSpacing: '0.02em' }}>自動備份</span>
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
            <div style={{ height: '1px', background: 'var(--border-glass-light)', margin: '4px 6px' }} />
            <button 
              className="dropdown-item danger-item" 
              style={{ fontSize: '0.95rem', fontWeight: 500, letterSpacing: '0.02em', whiteSpace: 'nowrap' }}
              onClick={() => setIsClearRecordsModalOpen(true)}
            >
              <Trash2 size={16} className="danger-icon" />
              清除動畫紀錄
            </button>
            <button 
              className="dropdown-item danger-item" 
              style={{ fontSize: '0.95rem', fontWeight: 500, letterSpacing: '0.02em', whiteSpace: 'nowrap' }}
              onClick={() => setIsClearAllModalOpen(true)}
            >
              <AlertTriangle size={16} className="danger-icon" />
              清除所有資料
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
        title="清除動畫紀錄"
        message={
          <>
            <p>確定要清除動畫紀錄嗎？這項操作將徹底清空：</p>
            <ul className="confirm-list">
              <li>動畫紀錄</li>
              <li>期待動畫</li>
            </ul>
            <p>您的期待動畫及動畫紀錄將會全部清空，可以重新添加喜愛的動畫。</p>
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
        title="清除所有資料"
        message={
          <>
            <p>確定要清除所有資料嗎？這項操作將徹底清空：</p>
            <ul className="confirm-list">
              <li>動畫紀錄</li>
              <li>期待動畫</li>
              <li>自行新增的動畫</li>
              <li>自訂的動畫名稱</li>
            </ul>
            <p>您的系統將完全恢復為預設的乾淨狀態。</p>
          </>
        }
      />
    </div>
  );
};

export default SettingsDropdown;

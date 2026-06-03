import React from 'react';
import './ImportExportButtons.css';
import { Upload, Download, ArrowRightLeft } from 'lucide-react';
import SettingsDropdown from './SettingsDropdown';
import { useDataManagement } from '../hooks/useDataManagement';

const ImportExportButtons: React.FC = () => {
  const { fileInputRef, handleExport, handleImportFile, isExportDisabled } = useDataManagement();

  return (
    <div className="import-export-container">
      <input
        type="file"
        accept=".csv"
        ref={fileInputRef}
        onChange={handleImportFile}
        style={{ display: 'none' }}
      />
      <button className="btn-glass import-btn" onClick={() => fileInputRef.current?.click()} title="從 CSV 匯入 (相容 Google 試算表)">
        <Upload size={18} />
        <span className="btn-text">匯入資料</span>
      </button>
      <ArrowRightLeft size={16} className="btn-divider-icon" />
      <button 
        className="btn-glass export-btn" 
        onClick={handleExport} 
        disabled={isExportDisabled} 
        title="將所有資料匯出為 CSV 備份 (可直接在 Google 試算表編輯)"
      >
        <Download size={18} />
        <span className="btn-text">本地備份</span>
      </button>
      
      <SettingsDropdown />
    </div>
  );
};

export default ImportExportButtons;

import React, { useState } from 'react';
import { Capacitor } from '@capacitor/core';
import './ImportExportButtons.css';
import SettingsDropdown from './SettingsDropdown';

const ImportExportButtons: React.FC = () => {
  const [isNative] = useState(() => Capacitor.isNativePlatform());

  return (
    <>
      {isNative ? null : (
        <div className="import-export-container">
          {!isNative && <SettingsDropdown />}
        </div>
      )}
    </>
  );
};

export default ImportExportButtons;

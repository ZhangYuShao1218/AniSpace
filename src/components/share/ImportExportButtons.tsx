import React, { useState } from 'react';
import { Capacitor } from '@capacitor/core';
import '@/components/share/ImportExportButtons.css';
import SettingsDropdown from '@/components/SettingsDropdown';

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

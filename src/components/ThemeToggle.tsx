import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import './ThemeToggle.css';

const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const { t } = useLanguage();

  return (
    <div className="theme-toggle-container">
      <Moon size={16} className={`side-icon ${theme === 'dark' ? 'active' : ''}`} />
      <button 
        className={`theme-toggle ${theme}`} 
        onClick={(e) => {
          e.stopPropagation();
          toggleTheme();
        }}
        title={theme === 'dark' ? t('switchToLight') : t('switchToDark')}
        aria-label="Toggle theme"
      >
        <div className="toggle-track">
          <div className="toggle-thumb"></div>
        </div>
      </button>
      <Sun size={16} className={`side-icon ${theme === 'light' ? 'active' : ''}`} />
    </div>
  );
};

export default ThemeToggle;

import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import './ThemeToggle.css';

const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="theme-toggle-container">
      <Moon size={16} className={`side-icon ${theme === 'dark' ? 'active' : ''}`} />
      <button 
        className={`theme-toggle ${theme}`} 
        onClick={(e) => {
          e.stopPropagation();
          toggleTheme();
        }}
        title={theme === 'dark' ? "切換為淺色模式" : "切換為深色模式"}
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

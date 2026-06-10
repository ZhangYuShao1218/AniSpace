import React from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import './Footer.css';

const Footer: React.FC = () => {
  const { t } = useLanguage();

  return (
    <footer className="app-footer">
      <div className="footer-content">
        <div className="footer-links">
          <Link to="/privacy" className="footer-link">{t('privacyPolicy')}</Link>
          <span className="footer-divider">•</span>
          <a href="https://www.youtube.com/@yuchen9245" target="_blank" rel="noopener noreferrer" className="footer-link">
            YouTube
          </a>
          <span className="footer-divider">•</span>
          <a href="https://play.google.com/store/apps/dev?id=5517905935127521457" target="_blank" rel="noopener noreferrer" className="footer-link">
            Google Play
          </a>
        </div>
        <div className="footer-copyright">
          &copy; {new Date().getFullYear()} AniSpace by ZhangYuShao. All rights reserved.
        </div>
      </div>
    </footer>
  );
};

export default Footer;

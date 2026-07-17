import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { HelpCircle, ChevronDown, CheckCircle2, Star, FileSpreadsheet, ImageIcon, Share2, Shield } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import './InfoCenterPage.css';

type TabType = 'about' | 'faq' | 'privacy';

const FAQItem: React.FC<{ question: string; answer: React.ReactNode }> = ({ question, answer }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className={`faq-item ${isOpen ? 'open' : ''}`}>
      <button className="faq-question" onClick={() => setIsOpen(!isOpen)} aria-expanded={isOpen}>
        <span>{question}</span>
        <ChevronDown size={18} className="faq-question-icon" />
      </button>
      {isOpen && <div className="faq-answer fade-in">{answer}</div>}
    </div>
  );
};

const InfoCenterPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useLanguage();

  // Determine tab from path or search query parameter
  const getTabFromLocation = (): TabType => {
    const path = location.pathname;
    if (path.includes('/faq')) return 'faq';
    if (path.includes('/about')) return 'about';
    if (path.includes('/privacy')) return 'privacy';

    const params = new URLSearchParams(location.search);
    const tabParam = params.get('tab') as TabType;
    if (tabParam === 'faq' || tabParam === 'about' || tabParam === 'privacy') {
      return tabParam;
    }
    return 'about'; // Default tab
  };

  const [activeTab, setActiveTab] = useState<TabType>(getTabFromLocation());

  useEffect(() => {
    const currentTab = getTabFromLocation();
    setActiveTab(currentTab);
    window.scrollTo({ top: 0, behavior: 'smooth' });

    if (location.pathname === '/info' || location.search.includes('tab=')) {
      if (currentTab === 'about') navigate('/about', { replace: true });
      else if (currentTab === 'faq') navigate('/faq', { replace: true });
      else if (currentTab === 'privacy') navigate('/privacy', { replace: true });
    }
  }, [location.pathname, location.search, navigate]);

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (tab === 'about') navigate('/about', { replace: true });
    else if (tab === 'faq') navigate('/faq', { replace: true });
    else if (tab === 'privacy') navigate('/privacy', { replace: true });
  };

  return (
    <div className="info-container fade-in">
      <div className="info-tabs-bar">
        <button
          className={`info-tab-btn ${activeTab === 'about' ? 'active' : ''}`}
          onClick={() => handleTabChange('about')}
        >
          <Star size={16} />
          <span>{t('aboutAniSpace')}</span>
        </button>
        <button
          className={`info-tab-btn ${activeTab === 'faq' ? 'active' : ''}`}
          onClick={() => handleTabChange('faq')}
        >
          <HelpCircle size={16} />
          <span>{t('faqTabTitle')}</span>
        </button>
        <button
          className={`info-tab-btn ${activeTab === 'privacy' ? 'active' : ''}`}
          onClick={() => handleTabChange('privacy')}
        >
          <CheckCircle2 size={16} />
          <span>{t('privacyPolicy')}</span>
        </button>
      </div>

      <div className="info-card glass-panel">
        {/* Tab 1: About AniSpace */}
        {activeTab === 'about' && (
          <div className="info-tab-content info-section">
            <h2><Star size={22} style={{ color: 'var(--accent-color)' }} /> {t('infoAboutTitle')}</h2>
            <p>{t('infoAboutLead')}</p>

            <h3>{t('infoAboutFeaturesTitle')}</h3>
            <div className="about-features-grid">
              <div className="about-feature-card">
                <div className="about-feature-header">
                  <div className="about-feature-icon"><Share2 size={22} /></div>
                  <h4>{t('infoAboutFeature1Title')}</h4>
                </div>
                <p>{t('infoAboutFeature1Desc')}</p>
              </div>
              <div className="about-feature-card">
                <div className="about-feature-header">
                  <div className="about-feature-icon"><FileSpreadsheet size={22} /></div>
                  <h4>{t('infoAboutFeature2Title')}</h4>
                </div>
                <p>{t('infoAboutFeature2Desc')}</p>
              </div>
              <div className="about-feature-card">
                <div className="about-feature-header">
                  <div className="about-feature-icon"><ImageIcon size={22} /></div>
                  <h4>{t('infoAboutFeature3Title')}</h4>
                </div>
                <p>{t('infoAboutFeature3Desc')}</p>
              </div>
              <div className="about-feature-card">
                <div className="about-feature-header">
                  <div className="about-feature-icon"><Shield size={22} /></div>
                  <h4>{t('infoAboutFeature4Title')}</h4>
                </div>
                <p>{t('infoAboutFeature4Desc')}</p>
              </div>
            </div>

            <h3>{t('infoAboutDevTitle')}</h3>
            <p>
              {t('infoAboutDevDesc1')}<strong>ZhangYuShao</strong>{t('infoAboutDevDesc2')}<strong>{t('infoAboutDevDescBold')}</strong>{t('infoAboutDevDesc3')}
            </p>
            <p className="last-updated">{t('infoAboutLastUpdated')}</p>
          </div>
        )}

        {/* Tab 2: FAQ */}
        {activeTab === 'faq' && (
          <div className="info-tab-content info-section">
            <h2><HelpCircle size={22} style={{ color: 'var(--accent-color)' }} /> {t('infoFaqTitle')}</h2>
            <p>{t('infoFaqLead')}</p>

            <div className="faq-list">
              <FAQItem
                question={t('infoFaqQ1')}
                answer={
                  <>
                    <p>{t('infoFaqA1Intro')}</p>
                    <ul>
                      <li><strong>{t('infoFaqA1Li1Bold')}</strong> {t('infoFaqA1Li1Text')}</li>
                      <li><strong>{t('infoFaqA1Li2Bold')}</strong> {t('infoFaqA1Li2Text')}</li>
                    </ul>
                  </>
                }
              />
              <FAQItem
                question={t('infoFaqQ2')}
                answer={
                  <>
                    <p>{t('infoFaqA2Intro')}</p>
                    <ul>
                      <li><strong>{t('infoFaqA2Li1Bold')}</strong> {t('infoFaqA2Li1Text')}</li>
                      <li><strong>{t('infoFaqA2Li2Bold')}</strong> {t('infoFaqA2Li2Text')}</li>
                    </ul>
                  </>
                }
              />
              <FAQItem
                question={t('infoFaqQ3')}
                answer={
                  <p>
                    <strong>{t('infoFaqA3Bold')}</strong><br />
                    {t('infoFaqA3Text1')}<strong>{t('infoFaqA3Bold2')}</strong>{t('infoFaqA3Text2')}<code>{t('infoFaqA3Code')}</code>{t('infoFaqA3Text3')}<strong>{t('infoFaqA3Bold3')}</strong> {t('infoFaqA3Text4')}
                  </p>
                }
              />
              <FAQItem
                question={t('infoFaqQ4')}
                answer={
                  <p>
                    {t('infoFaqA4Text1')}<strong>{t('infoFaqA4Bold')}</strong>{t('infoFaqA4Text2')}
                  </p>
                }
              />
              <FAQItem
                question={t('infoFaqQ5')}
                answer={
                  <p>
                    {t('infoFaqA5Text1')}<strong>{t('infoFaqA5Bold')}</strong>{t('infoFaqA5Text2')}
                  </p>
                }
              />
              <FAQItem
                question={t('infoFaqQ6')}
                answer={
                  <p>{t('infoFaqA6Text')}</p>
                }
              />
            </div>
            <p className="last-updated">{t('infoFaqFooter')}</p>
          </div>
        )}

        {/* Tab 3: Privacy Policy */}
        {activeTab === 'privacy' && (
          <div className="info-tab-content info-section">
            <h2><CheckCircle2 size={22} style={{ color: 'var(--accent-color)' }} /> {t('infoPrivacyTitle')}</h2>
            <p>{t('infoPrivacyIntro')}</p>

            <h3>{t('infoPrivacySec1Title')}</h3>
            <p>{t('infoPrivacySec1Intro')}</p>
            <ul>
              <li>
                <strong>{t('infoPrivacySec1Li1Bold')}</strong> {t('infoPrivacySec1Li1Text')}
              </li>
              <li>
                <strong>{t('infoPrivacySec1Li2Bold')}</strong> {t('infoPrivacySec1Li2Text')}
              </li>
            </ul>

            <h3>{t('infoPrivacySec2Title')}</h3>
            <p>{t('infoPrivacySec2Intro')}</p>
            <ul>
              <li><a href="https://policies.google.com/privacy" target="_blank" rel="noreferrer">{t('infoPrivacySec2Link1')}</a></li>
              <li><a href="https://support.google.com/admob/answer/6128543" target="_blank" rel="noreferrer">{t('infoPrivacySec2Link2')}</a></li>
              <li><a href="https://firebase.google.com/policies/analytics" target="_blank" rel="noreferrer">{t('infoPrivacySec2Link3')}</a></li>
            </ul>

            <h3>{t('infoPrivacySec3Title')}</h3>
            <p>{t('infoPrivacySec3Text')}</p>

            <h3>{t('infoPrivacySec4Title')}</h3>
            <p>
              {t('infoPrivacySec4Text')}
              <a href="mailto:sar0977@gmail.com">sar0977@gmail.com</a>
            </p>

            <p className="last-updated">{t('infoPrivacyLastUpdated')}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default InfoCenterPage;

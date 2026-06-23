import React, { useState, useEffect } from 'react';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface TutorialModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const TutorialModal: React.FC<TutorialModalProps> = ({ isOpen, onClose }) => {
  const { t } = useLanguage();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsClosing(false);
      setCurrentSlide(0);
    }
  }, [isOpen]);

  if (!isOpen && !isClosing) return null;

  const slides = [
    {
      id: 'welcome',
      icon: <img src="/tutorial/AniSpaceTutorial_01.png" alt="Welcome" style={{ width: '100%', height: 'auto', display: 'block', borderRadius: '27px' }} onError={(e) => { e.currentTarget.style.display = 'none'; }} />,
      desc: t('tutorialWelcomeDesc'),
    },
    {
      id: 'add',
      icon: <img src="/tutorial/AniSpaceTutorial_02.png" alt="Add Custom Anime" style={{ width: '100%', height: 'auto', display: 'block', borderRadius: '27px' }} onError={(e) => { e.currentTarget.style.display = 'none'; }} />,
      desc: t('tutorialAddCustomDesc'),
    },
    {
      id: 'sync',
      icon: <img src="/tutorial/AniSpaceTutorial_03.png" alt="Sync Latest" style={{ width: '100%', height: 'auto', display: 'block', borderRadius: '27px' }} onError={(e) => { e.currentTarget.style.display = 'none'; }} />,
      desc: t('tutorialSyncLatestDesc'),
    },
    {
      id: 'cloud',
      icon: <img src="/tutorial/AniSpaceTutorial_04.png" alt="Cloud Backup" style={{ width: '100%', height: 'auto', display: 'block', borderRadius: '27px' }} onError={(e) => { e.currentTarget.style.display = 'none'; }} />,
      desc: t('tutorialCloudBackupDesc'),
    },
    {
      id: 'share',
      icon: <img src="/tutorial/AniSpaceTutorial_05.png" alt="Share" style={{ width: '100%', height: 'auto', display: 'block', borderRadius: '27px' }} onError={(e) => { e.currentTarget.style.display = 'none'; }} />,
      desc: t('tutorialShareDesc'),
    }
  ];

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(prev => prev + 1);
    } else {
      handleClose();
    }
  };

  const handlePrev = () => {
    if (currentSlide > 0) {
      setCurrentSlide(prev => prev - 1);
    }
  };

  const handleClose = () => {
    setIsClosing(true);
    localStorage.setItem('hasSeenTutorial', 'true');
    setTimeout(() => {
      onClose();
      setIsClosing(false);
    }, 300);
  };

  return (
    <div className={`modal-overlay ${isClosing ? 'fade-out' : 'fade-in'}`} onClick={handleClose}>
      <div 
        className={`modal-content ${isClosing ? 'slide-down' : 'slide-up'}`}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '460px',
          padding: '5px 5px 0 5px',
          margin: 'auto auto max(15px, calc(50vh - 310px)) auto',
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-glass-light)',
          borderRadius: '32px',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.6)'
        }}
      >
        {/* Top Image Area (Fade Animation with Grid Stacking) */}
        <div style={{ display: 'grid', width: '100%' }}>
          {slides.map((slide, index) => (
            <div 
              key={slide.id} 
              style={{ 
                gridArea: '1 / 1 / 2 / 2',
                display: 'flex', 
                justifyContent: 'center', 
                width: '100%',
                opacity: index === currentSlide ? 1 : 0,
                transition: 'opacity 0.3s ease',
                pointerEvents: index === currentSlide ? 'auto' : 'none',
                zIndex: index === currentSlide ? 1 : 0
              }}
            >
              {slide.icon}
            </div>
          ))}
        </div>

        {/* Divider with 10px spacing top and bottom */}
        <div style={{ height: '1px', background: 'var(--border-glass-light)', width: '100%', margin: '10px 0' }} />

        {/* Bottom Area for Text and Buttons */}
        <div style={{
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          background: 'transparent'
        }}>
          {/* Description Text (Fade Animation) */}
          <div key={`text-${currentSlide}`} className="fade-in" style={{ padding: '0 24px', textAlign: 'left', minHeight: '60px', display: 'flex', alignItems: 'center', justifyContent: 'flex-start' }}>
            <p style={{ color: 'var(--text-primary)', lineHeight: '1.6', fontSize: '18px', margin: 0 }}>
              {slides[currentSlide].desc}
            </p>
          </div>

          {/* Footer with Buttons */}
          <div style={{ padding: '12px 24px', display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
            <button 
              className="btn-glass"
              style={{ flex: 1, padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: currentSlide === 0 ? 0.5 : 1, cursor: currentSlide === 0 ? 'not-allowed' : 'pointer', border: '1px solid rgba(150, 150, 150, 0.5)' }}
              onClick={currentSlide === 0 ? undefined : handlePrev}
              disabled={currentSlide === 0}
            >
              <ChevronLeft size={18} style={{ marginRight: '4px' }} />
              <span style={{ fontWeight: 500 }}>{t('tutorialPrev')}</span>
            </button>
            <button 
              className="btn-primary"
              style={{ flex: 1, padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              onClick={handleNext}
            >
              <span style={{ fontWeight: 500 }}>{currentSlide === slides.length - 1 ? t('tutorialStart') : t('tutorialNext')}</span>
              {currentSlide !== slides.length - 1 && <ChevronRight size={18} style={{ marginLeft: '4px' }} />}
            </button>
          </div>

          {/* Pagination Dots at the VERY bottom */}
          <div style={{ padding: '0 24px 19px', display: 'flex', justifyContent: 'center', gap: '8px' }}>
            {slides.map((_, index) => (
              <div
                key={index}
                onClick={() => setCurrentSlide(index)}
                style={{
                  width: index === currentSlide ? '24px' : '8px',
                  height: '8px',
                  borderRadius: '4px',
                  background: index === currentSlide ? 'var(--accent-color)' : 'var(--border-glass)',
                  transition: 'all 0.3s ease',
                  cursor: 'pointer'
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TutorialModal;

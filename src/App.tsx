import { Routes, Route } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import './App.css';
import { useGlobalKeyboardFix } from '@/hooks/useGlobalKeyboardFix';
import AppHeader from '@/components/layout/AppHeader';
import BottomNavBar from '@/components/layout/BottomNavBar';
import AllAnimePage from './pages/AllAnimePage';
import PlanToWatchPage from './pages/PlanToWatchPage';
import WatchedPage from './pages/WatchedPage';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';
import Footer from '@/components/layout/Footer';
import { ShareProgressPill } from '@/components/share/ShareProgressPill';
import TutorialModal from '@/components/modals/TutorialModal';
import { useState, useEffect } from 'react';

function App() {
  const isNative = Capacitor.isNativePlatform();
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);

  useGlobalKeyboardFix();

  useEffect(() => {
    const hasSeen = localStorage.getItem('hasSeenTutorial');
    if (!hasSeen) {
      setIsTutorialOpen(true);
    }

    const handleOpenTutorial = () => setIsTutorialOpen(true);
    window.addEventListener('open-tutorial', handleOpenTutorial);
    
    return () => {
      window.removeEventListener('open-tutorial', handleOpenTutorial);
    };
  }, []);

  return (
    <div className={`app-container ${isNative ? 'has-bottom-nav' : ''}`}>
      <AppHeader />

      <main className="container wrapper">
        <Routes>
          <Route path="/" element={<AllAnimePage />} />
          <Route path="/plan" element={<PlanToWatchPage />} />
          <Route path="/records" element={<WatchedPage />} />
          <Route path="/privacy" element={<PrivacyPolicyPage />} />
        </Routes>
      </main>

      {!isNative && <Footer />}

      {isNative && <BottomNavBar />}
      
      <ShareProgressPill />
      <TutorialModal isOpen={isTutorialOpen} onClose={() => setIsTutorialOpen(false)} />
    </div>
  );
}

export default App;

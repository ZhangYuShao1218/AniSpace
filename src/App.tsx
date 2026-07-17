import { lazy, Suspense, useState, useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import './App.css';
import { useGlobalKeyboardFix } from '@/hooks/useGlobalKeyboardFix';
import AppHeader from '@/components/layout/AppHeader';
import BottomNavBar from '@/components/layout/BottomNavBar';
import AllAnimePage from './pages/AllAnimePage';
import Footer from '@/components/layout/Footer';
import { ShareProgressPill } from '@/components/share/ShareProgressPill';
import TutorialModal from '@/components/modals/TutorialModal';
import { Loader2 } from 'lucide-react';

const PlanToWatchPage = lazy(() => import('./pages/PlanToWatchPage'));
const WatchedPage = lazy(() => import('./pages/WatchedPage'));
const GamerAuditPage = lazy(() => import('./pages/GamerAuditPage').then(m => ({ default: m.GamerAuditPage || (m as any).default })));
const InfoCenterPage = lazy(() => import('./pages/InfoCenterPage'));
const AnimeDetailPage = lazy(() => import('./pages/AnimeDetailPage'));
const AnimeDetailModal = lazy(() => import('./components/modals/AnimeDetailModal').then(m => ({ default: m.AnimeDetailModal || (m as any).default })));

const PageLoader = () => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
    <Loader2 className="animate-spin" size={32} style={{ color: 'var(--accent-color)' }} />
  </div>
);

function App() {
  const isNative = Capacitor.isNativePlatform();
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);
  const location = useLocation();
  const state = location.state as { backgroundLocation?: any };
  const backgroundLocation = state?.backgroundLocation;

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
        <Suspense fallback={<PageLoader />}>
          <Routes location={backgroundLocation || location}>
            <Route path="/" element={<AllAnimePage />} />
            <Route path="/plan" element={<PlanToWatchPage />} />
            <Route path="/records" element={<WatchedPage />} />
            <Route path="/info" element={<InfoCenterPage />} />
            <Route path="/about" element={<InfoCenterPage />} />
            <Route path="/faq" element={<InfoCenterPage />} />
            <Route path="/privacy" element={<InfoCenterPage />} />
            <Route path="/anime/:id" element={<AnimeDetailPage />} />
            <Route path="/gamer-audit" element={<GamerAuditPage />} />
          </Routes>

          {backgroundLocation && (
            <Routes>
              <Route path="/anime/:id" element={<AnimeDetailModal />} />
            </Routes>
          )}
        </Suspense>
      </main>

      {!isNative && <Footer />}

      {isNative && <BottomNavBar />}
      
      <ShareProgressPill />
      <TutorialModal isOpen={isTutorialOpen} onClose={() => setIsTutorialOpen(false)} />
    </div>
  );
}

export default App;


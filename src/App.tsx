import { lazy, Suspense, useState, useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import './App.css';
import { useGlobalKeyboardFix } from '@/hooks/useGlobalKeyboardFix';
import { useAnime, useAnimeSync } from '@/contexts/AnimeContext';
import AppHeader from '@/components/layout/AppHeader';
import BottomNavBar from '@/components/layout/BottomNavBar';
import AllAnimePage from './pages/AllAnimePage';
import Footer from '@/components/layout/Footer';
import { ShareProgressPill } from '@/components/share/ShareProgressPill';
import TutorialModal from '@/components/modals/TutorialModal';
import { AnimeDetailModal } from '@/components/modals/AnimeDetailModal';
import { Loader2 } from 'lucide-react';

const PlanToWatchPage = lazy(() => import('./pages/PlanToWatchPage'));
const WatchedPage = lazy(() => import('./pages/WatchedPage'));
const GamerAuditPage = lazy(() => import('./pages/GamerAuditPage').then(m => ({ default: m.GamerAuditPage || (m as any).default })));
const InfoCenterPage = lazy(() => import('./pages/InfoCenterPage'));
const AnimeDetailPage = lazy(() => import('./pages/AnimeDetailPage'));

const PageLoader = () => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
    <Loader2 className="animate-spin" size={32} style={{ color: 'var(--accent-color)' }} />
  </div>
);

function App() {
  const isNative = Capacitor.isNativePlatform();
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);
  const location = useLocation();
  
  // 取得路由狀態中的背景位置
  let backgroundLocation = (location.state as any)?.backgroundLocation;

  // 攔截直接造訪 /anime/:id 的情況 (例如直接輸入網址或重新整理)
  // 如果沒有 backgroundLocation，強制將背景設定為首頁 ('/')
  if (!backgroundLocation && location.pathname.startsWith('/anime/')) {
    backgroundLocation = { pathname: '/', search: '', hash: '', state: null, key: 'default-bg' };
  }

  const { isInitializing } = useAnime();
  const { isScraping } = useAnimeSync();

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

  if (isInitializing) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: 'var(--bg-color)', color: 'var(--text-color)' }}>
        <Loader2 className="animate-spin" size={48} style={{ color: 'var(--accent-color)', marginBottom: '16px' }} />
        <h2 style={{ fontSize: '1.2rem', fontWeight: 600, margin: 0 }}>載入動畫資料庫...</h2>
        {isScraping && <p style={{ opacity: 0.7, marginTop: '8px', fontSize: '0.9rem' }}>正在與雲端同步資料，這可能需要幾秒鐘</p>}
      </div>
    );
  }

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


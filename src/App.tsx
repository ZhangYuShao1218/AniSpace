import { Routes, Route } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import './App.css';
import AppHeader from './components/AppHeader';
import BottomNavBar from './components/BottomNavBar';
import AllAnimePage from './pages/AllAnimePage';
import PlanToWatchPage from './pages/PlanToWatchPage';
import WatchedPage from './pages/WatchedPage';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';
import Footer from './components/Footer';
import { ShareProgressPill } from './components/ShareProgressPill';

function App() {
  const isNative = Capacitor.isNativePlatform();

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
    </div>
  );
}

export default App;

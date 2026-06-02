import { Routes, Route } from 'react-router-dom';
import './App.css';
import AppHeader from './components/AppHeader';
import AllAnimePage from './pages/AllAnimePage';
import PlanToWatchPage from './pages/PlanToWatchPage';
import WatchedPage from './pages/WatchedPage';

function App() {
  return (
    <div className="app-container">
      <AppHeader />

      <main className="container wrapper">
        <Routes>
          <Route path="/" element={<AllAnimePage />} />
          <Route path="/plan" element={<PlanToWatchPage />} />
          <Route path="/records" element={<WatchedPage />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;

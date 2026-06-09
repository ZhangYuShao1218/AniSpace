import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { AnimeProvider } from './contexts/AnimeContext'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { GoogleSyncProvider } from './contexts/GoogleSyncContext'
import { AlertProvider } from './contexts/AlertContext'
import { ThemeProvider } from './contexts/ThemeContext'
import { LanguageProvider } from './contexts/LanguageContext'
import { AdMobProvider } from './contexts/AdMobContext'
import { ShareTaskProvider } from './contexts/ShareTaskContext'

const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GoogleOAuthProvider clientId={clientId}>
      <BrowserRouter>
        <ThemeProvider>
          <LanguageProvider>
            <AnimeProvider>
              <AlertProvider>
                <GoogleSyncProvider>
                  <AdMobProvider>
                    <ShareTaskProvider>
                      <App />
                    </ShareTaskProvider>
                  </AdMobProvider>
                </GoogleSyncProvider>
              </AlertProvider>
            </AnimeProvider>
          </LanguageProvider>
        </ThemeProvider>
      </BrowserRouter>
    </GoogleOAuthProvider>
  </StrictMode>,
)

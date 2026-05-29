import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { AnimeProvider } from './contexts/AnimeContext'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { GoogleSyncProvider } from './contexts/GoogleSyncContext'

const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GoogleOAuthProvider clientId={clientId}>
      <BrowserRouter>
        <AnimeProvider>
          <GoogleSyncProvider>
            <App />
          </GoogleSyncProvider>
        </AnimeProvider>
      </BrowserRouter>
    </GoogleOAuthProvider>
  </StrictMode>,
)

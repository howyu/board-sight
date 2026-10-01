if ('serviceWorker' in navigator && !window.crossOriginIsolated) {
  navigator.serviceWorker.register('./coi-serviceworker.js').then(() => {
    if (!navigator.serviceWorker.controller) {
      navigator.serviceWorker.ready.then(() => window.location.reload());
    }
  }).catch((error) => {
    console.warn('Pikafish cross-origin isolation service worker failed:', error);
  });
}

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

// Purge obsolete or poisoned runtime caches from previous versions
if (typeof caches !== 'undefined') {
  caches.delete('pyodide-cdn-cache').catch(() => {});
}

// Register service worker for offline support and asset caching
registerSW({
  immediate: true,
  onNeedRefresh() {
    console.log('[PWA] New content available.');
  },
  onOfflineReady() {
    console.log('[PWA] App is ready to work offline.');
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

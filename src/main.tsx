import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// The Android APK serves the compiled UI locally, while the API remains on Vercel.
// In the normal web deployment this stays empty and requests remain same-origin.
const apiBase = (import.meta.env.VITE_API_BASE || '').replace(/\/$/, '');
if (apiBase) {
  const nativeFetch = window.fetch.bind(window);
  window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    if (typeof input === 'string' && input.startsWith('/api/')) {
      return nativeFetch(`${apiBase}${input}`, init);
    }
    return nativeFetch(input, init);
  };
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

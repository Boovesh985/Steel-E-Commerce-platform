import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Capacitor } from '@capacitor/core';
import App from './App.jsx';
import './index.css';

// In dev mode, run against an in-memory mock backend unless VITE_USE_MOCKS=false.
// This lets the full UI (products, cart, checkout, orders, admin) be explored
// with realistic data before a real API and database exist.
if (import.meta.env.DEV && import.meta.env.VITE_USE_MOCKS !== 'false') {
  const { enableMocks } = await import('./mocks/handlers.js');
  enableMocks();
}

// ---- Capacitor native plugin initialization ----
// These are no-ops when running in a regular browser.
if (Capacitor.isNativePlatform()) {
  import('@capacitor/splash-screen').then(({ SplashScreen }) => {
    SplashScreen.hide();
  });
  import('@capacitor/status-bar').then(({ StatusBar, Style }) => {
    StatusBar.setStyle({ style: Style.Light }); // dark icons for light background
    StatusBar.setBackgroundColor({ color: '#FFFFFF' });
    StatusBar.setOverlaysWebView({ overlay: false }); // don't overlap content
  });
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 30,
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>
);

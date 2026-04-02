import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router';          // react-router, NOT react-router-dom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './contexts/AuthContext.tsx';
import App from './App.tsx';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

function showError(label: string, error: unknown) {
  const root = document.getElementById('root');
  if (!root) return;
  const msg = error instanceof Error ? `${error.message}\n${error.stack}` : String(error);
  root.innerHTML = `<pre style="padding:1rem;color:red;font-size:11px;white-space:pre-wrap;word-break:break-all">${label}: ${msg}\nUA: ${navigator.userAgent}</pre>`;
}

try {
  ReactDOM.createRoot(document.getElementById('root')!, {
    onUncaughtError: (error) => showError('Uncaught', error),
    onCaughtError: (error) => showError('Caught', error),
    onRecoverableError: (error) => showError('Recoverable', error),
  }).render(
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter basename={import.meta.env.VITE_BASE_PATH || '/'}>
          <AuthProvider>
            <App />
          </AuthProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </React.StrictMode>,
  );
} catch (err) {
  showError('Sync mount', err);
}

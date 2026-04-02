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

try {
  ReactDOM.createRoot(document.getElementById('root')!).render(
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
  const root = document.getElementById('root');
  if (root) {
    root.innerHTML = `<pre style="padding:1rem;color:red;font-size:12px;white-space:pre-wrap">React mount error: ${err}</pre>`;
  }
}

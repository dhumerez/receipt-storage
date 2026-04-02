import { Component } from 'react';
import type { ReactNode, ErrorInfo } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './contexts/AuthContext.tsx';
import App from './App.tsx';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
    },
  },
});

// Error boundary to catch render crashes
class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state: { error: Error | null } = { error: null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info.componentStack);
  }
  render() {
    if (this.state.error) {
      return (
        <pre style={{ padding: '1rem', color: 'red', fontSize: '11px', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
          {'ErrorBoundary: ' + this.state.error.message + '\n' + this.state.error.stack + '\nUA: ' + navigator.userAgent}
        </pre>
      );
    }
    return this.props.children;
  }
}

// Use the global diagnostic logger from index.html
const dlog = (window as unknown as { _dlog: (msg: string) => void })._dlog
  ?? ((msg: string) => console.log('[diag]', msg));

// Normalize basename: strip trailing slashes, ensure leading slash
const rawBase = import.meta.env.VITE_BASE_PATH || '/';
const basename = rawBase.replace(/\/+$/, '') || '/';

dlog('main.tsx executing, pathname=' + window.location.pathname);
dlog('BASE_PATH raw="' + rawBase + '" normalized="' + basename + '"');
dlog('API_URL="' + (import.meta.env.VITE_API_URL ?? '') + '"');

try {
  dlog('createRoot starting');
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter basename={basename}>
          <AuthProvider>
            <App />
          </AuthProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>,
  );
  dlog('render() called');
} catch (err) {
  dlog('SYNC_MOUNT_ERROR: ' + (err instanceof Error ? err.message : String(err)));
  console.error('Sync mount error:', err);
}

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
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter basename={import.meta.env.VITE_BASE_PATH || '/'}>
          <AuthProvider>
            <App />
          </AuthProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>,
  );
} catch (err) {
  showError('Sync mount', err);
}

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

// React Router v7 BrowserRouter returns null (blank page) if basename has a
// trailing slash and the URL matches without one (e.g. basename="/app/" vs
// URL "/app"). Always strip trailing slashes before passing to BrowserRouter.
const basename = (import.meta.env.VITE_BASE_PATH || '/').replace(/\/+$/, '') || '/';

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

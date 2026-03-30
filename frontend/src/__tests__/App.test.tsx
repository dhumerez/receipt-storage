import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi } from 'vitest';
import App from '../App.tsx';
import { AuthProvider } from '../contexts/AuthContext.tsx';

// Mock the auth API so AuthProvider doesn't make real network calls
vi.mock('../api/auth.ts', () => ({
  refreshToken: vi.fn().mockRejectedValue(new Error('No refresh token')),
  login: vi.fn(),
  logout: vi.fn(),
}));

function Wrapper({ children, initialEntries }: { children: React.ReactNode; initialEntries: string[] }) {
  return (
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MemoryRouter initialEntries={initialEntries}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('App routing', () => {
  it('redirects unauthenticated user from / to /login', async () => {
    render(
      <Wrapper initialEntries={['/']}>
        <App />
      </Wrapper>,
    );
    // While session recovery is in flight, loading spinner is shown
    // After refresh fails, ProtectedRoute redirects to /login showing Sign In heading
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Sign In' })).toBeInTheDocument();
    });
  });

  it('renders Login on /login route', async () => {
    render(
      <Wrapper initialEntries={['/login']}>
        <App />
      </Wrapper>,
    );
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Sign In' })).toBeInTheDocument();
    });
  });
});

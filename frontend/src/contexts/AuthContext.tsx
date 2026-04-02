import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import type { AuthUser } from '../api/auth.ts';
import { login as apiLogin, logout as apiLogout, refreshToken as apiRefreshToken } from '../api/auth.ts';
import { setAccessToken } from '../api/client.ts';

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// Diagnostic logger — writes to the on-screen #diag panel from index.html
function dlog(msg: string) {
  const el = document.getElementById('diag');
  if (el) el.textContent += '\n' + (Date.now() % 100000) + ' ' + msg;
  console.log('[diag]', msg);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // On mount: attempt silent session recovery via refresh cookie
  useEffect(() => {
    dlog('AuthProvider: refreshing token...');
    apiRefreshToken()
      .then(({ accessToken, user }) => {
        dlog('AuthProvider: refresh OK, role=' + user.role);
        setAccessToken(accessToken);
        setUser(user);
      })
      .catch((err) => {
        dlog('AuthProvider: refresh FAILED — ' + (err instanceof Error ? err.message : String(err)));
        // No valid refresh cookie — user must log in
        setUser(null);
      })
      .finally(() => {
        dlog('AuthProvider: isLoading=false');
        setIsLoading(false);
      });
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<AuthUser> => {
    const { accessToken, user } = await apiLogin(email, password);
    setAccessToken(accessToken);
    setUser(user);
    return user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiLogout();
    } catch {
      // Ignore errors — clear state regardless
    }
    setAccessToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

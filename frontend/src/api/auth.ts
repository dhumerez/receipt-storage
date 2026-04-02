import { apiClient } from './client.ts';

export interface AuthUser {
  sub: string;
  companyId: string | null;
  role: 'owner' | 'collaborator' | 'viewer' | 'client';
  isSuperAdmin: boolean;
  clientId?: string;
}

function decodeJwt(token: string): AuthUser {
  const payload = JSON.parse(atob(token.split('.')[1]));
  return {
    sub: payload.sub,
    companyId: payload.companyId ?? null,
    role: payload.role,
    isSuperAdmin: payload.isSuperAdmin ?? false,
    clientId: payload.clientId,
  };
}

export async function login(email: string, password: string): Promise<{ accessToken: string; user: AuthUser }> {
  const data = await apiClient<{ accessToken: string }>('/api/auth/login', {
    method: 'POST',
    json: { email, password },
  });
  return { accessToken: data.accessToken, user: decodeJwt(data.accessToken) };
}

// Deduplicate concurrent refresh calls (React StrictMode double-mount, 401 races)
let _refreshing: Promise<{ accessToken: string; user: AuthUser }> | null = null;

export function refreshToken(): Promise<{ accessToken: string; user: AuthUser }> {
  if (!_refreshing) {
    _refreshing = apiClient<{ accessToken: string }>('/api/auth/refresh', {
      method: 'POST',
      _isRetry: true, // skip apiClient's own 401→refresh interceptor
    })
      .then(data => ({ accessToken: data.accessToken, user: decodeJwt(data.accessToken) }))
      .finally(() => { _refreshing = null; });
  }
  return _refreshing;
}

export async function logout(): Promise<void> {
  await apiClient('/api/auth/logout', { method: 'POST' });
}

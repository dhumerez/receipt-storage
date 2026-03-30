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

export async function refreshToken(): Promise<{ accessToken: string; user: AuthUser }> {
  const data = await apiClient<{ accessToken: string }>('/api/auth/refresh', {
    method: 'POST',
  });
  return { accessToken: data.accessToken, user: decodeJwt(data.accessToken) };
}

export async function logout(): Promise<void> {
  await apiClient('/api/auth/logout', { method: 'POST' });
}

import { apiClient } from './client.ts';

export interface TeamMember {
  id: string;
  email: string;
  fullName: string;
  role: 'owner' | 'collaborator' | 'viewer' | 'client';
  isActive: boolean;
  createdAt: string;
}

export function getTeamMembers(): Promise<TeamMember[]> {
  return apiClient<TeamMember[]>('/api/v1/users');
}

export function inviteUser(data: {
  email: string;
  role: 'owner' | 'collaborator' | 'viewer';
  fullName: string;
}): Promise<{ message: string }> {
  return apiClient<{ message: string }>('/api/v1/users/invite', {
    method: 'POST',
    json: data,
  });
}

export function changeRole(
  id: string,
  role: 'owner' | 'collaborator' | 'viewer' | 'client',
): Promise<{ id: string; email: string; role: string }> {
  return apiClient<{ id: string; email: string; role: string }>(
    `/api/v1/users/${id}/role`,
    { method: 'PATCH', json: { role } },
  );
}

export function deactivateUser(
  id: string,
): Promise<{ message: string; pendingTransactionsReverted: number; pendingPaymentsRejected: number }> {
  return apiClient(`/api/v1/users/${id}/deactivate`, { method: 'PATCH' });
}

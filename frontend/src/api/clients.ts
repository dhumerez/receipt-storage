import { apiClient } from './client.ts';

export interface ClientListItem {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  isActive: boolean;
  outstandingBalance: string;
  createdAt: string;
}

export interface Client {
  id: string;
  companyId: string;
  userId: string | null;
  fullName: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  storeName: string | null;
  googleLocation: string | null;
  referencesText: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateClientInput {
  fullName: string;
  email?: string;
  phone?: string;
  address?: string;
  storeName?: string;
  googleLocation?: string;
  referencesText?: string;
}

export interface UpdateClientInput extends Partial<CreateClientInput> {}

export function getClients(params: { search?: string; status?: string }): Promise<ClientListItem[]> {
  const qs = new URLSearchParams();
  if (params.search) qs.set('search', params.search);
  if (params.status) qs.set('status', params.status);
  return apiClient<ClientListItem[]>(`/api/v1/clients?${qs.toString()}`);
}

export function getClient(id: string): Promise<Client> {
  return apiClient<Client>(`/api/v1/clients/${id}`);
}

export function createClient(input: CreateClientInput): Promise<Client> {
  return apiClient<Client>('/api/v1/clients', { method: 'POST', json: input });
}

export function updateClient(id: string, input: UpdateClientInput): Promise<Client> {
  return apiClient<Client>(`/api/v1/clients/${id}`, { method: 'PATCH', json: input });
}

export function deactivateClient(id: string): Promise<void> {
  return apiClient<void>(`/api/v1/clients/${id}/deactivate`, { method: 'PATCH' });
}

export function sendPortalInvite(id: string): Promise<{ message: string }> {
  return apiClient<{ message: string }>(`/api/v1/clients/${id}/invite`, { method: 'POST' });
}

export interface DebtItem {
  id: string;
  status: 'open' | 'partially_paid' | 'fully_paid' | 'written_off';
  totalAmount: string;
  amountPaid: string;
  remainingBalance: string;
}

export interface ClientDebtsResponse {
  client: { id: string; fullName: string; outstandingBalance: string };
  debts: DebtItem[];
  asOf: string;
}

export function getClientDebts(clientId: string): Promise<ClientDebtsResponse> {
  return apiClient<ClientDebtsResponse>(`/api/v1/clients/${clientId}/debts`);
}

import { apiClient } from './client.ts';

export interface PortalSummary {
  confirmedBalance: string;
  pendingBalance: string;
  asOf: string;
}

export interface PortalDebt {
  id: string;
  status: 'open' | 'partially_paid' | 'fully_paid' | 'written_off';
  totalAmount: string;
  amountPaid: string;
  remainingBalance: string;
}

export function getPortalSummary(): Promise<PortalSummary> {
  // clientId is NOT sent — backend reads it from JWT
  return apiClient<PortalSummary>('/api/v1/portal/summary');
}

export function getPortalDebts(): Promise<PortalDebt[]> {
  // clientId is NOT sent — backend reads it from JWT
  return apiClient<PortalDebt[]>('/api/v1/portal/debts');
}

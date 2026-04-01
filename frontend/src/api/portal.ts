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

export interface PortalPaymentItem {
  id: string;
  amount: string;
  paidAt: string;
  paymentMethod: string | null;
  reference: string | null;
  notes: string | null;
  status: 'confirmed' | 'pending_approval' | 'rejected';
  recordedByName: string;
  createdAt: string;
  documents: Array<{
    id: string;
    filePath: string;
    originalName: string;
    mimeType: string;
    fileSizeBytes: number;
  }>;
}

export interface PortalDebtDetail {
  id: string;
  clientId: string;
  transactionRef: string;
  totalAmount: string;
  amountPaid: string;
  remainingBalance: string;
  status: 'open' | 'partially_paid' | 'fully_paid' | 'written_off';
  writeOffReason: string | null;
  createdAt: string;
  payments: PortalPaymentItem[];
}

export function getPortalDebt(id: string): Promise<PortalDebtDetail> {
  return apiClient<PortalDebtDetail>(`/api/v1/portal/debts/${id}`);
}

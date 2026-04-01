import { apiClient } from './client.ts';

const BASE_URL = import.meta.env.VITE_API_URL ?? '';

export interface DocumentInfo {
  id: string;
  filePath: string;
  originalName: string;
  mimeType: string;
  fileSizeBytes: number;
}

export interface PaymentItem {
  id: string;
  amount: string;
  paidAt: string;
  paymentMethod: string | null;
  reference: string | null;
  notes: string | null;
  status: 'confirmed' | 'pending_approval' | 'rejected';
  recordedByName: string;
  rejectionReason: string | null;
  createdAt: string;
  documents: DocumentInfo[];
}

export interface DebtDetail {
  id: string;
  companyId: string;
  clientId: string;
  clientName: string;
  transactionId: string;
  transactionRef: string;
  totalAmount: string;
  amountPaid: string;
  remainingBalance: string;
  status: 'open' | 'partially_paid' | 'fully_paid' | 'written_off';
  writeOffReason: string | null;
  createdAt: string;
  payments: PaymentItem[];
  transactionDocuments: DocumentInfo[];
}

export interface CreatePaymentInput {
  amount: string;
  paidAt: string;
  paymentMethod: string;
  reference?: string;
  notes?: string;
}

export function getDebt(id: string): Promise<DebtDetail> {
  return apiClient<DebtDetail>(`/api/v1/debts/${id}`);
}

export function createPayment(debtId: string, input: CreatePaymentInput, files: File[]): Promise<PaymentItem> {
  const formData = new FormData();
  formData.append('data', JSON.stringify(input));
  files.forEach((f) => formData.append('files', f));

  // CRITICAL: pass headers: {} to override apiClient's default Content-Type
  // so browser sets multipart boundary automatically
  return apiClient<PaymentItem>(`/api/v1/debts/${debtId}/payments`, {
    method: 'POST',
    body: formData,
    headers: {},
  });
}

export function approvePayment(debtId: string, paymentId: string): Promise<PaymentItem> {
  return apiClient<PaymentItem>(`/api/v1/debts/${debtId}/payments/${paymentId}/approve`, {
    method: 'POST',
  });
}

export function rejectPayment(debtId: string, paymentId: string, reason: string): Promise<PaymentItem> {
  return apiClient<PaymentItem>(`/api/v1/debts/${debtId}/payments/${paymentId}/reject`, {
    method: 'POST',
    json: { reason },
  });
}

export function writeOffDebt(id: string, reason: string): Promise<DebtDetail> {
  return apiClient<DebtDetail>(`/api/v1/debts/${id}/write-off`, {
    method: 'POST',
    json: { reason },
  });
}

export function reopenDebt(id: string): Promise<DebtDetail> {
  return apiClient<DebtDetail>(`/api/v1/debts/${id}/reopen`, {
    method: 'POST',
  });
}

export function getPaymentFileUrl(filePath: string): string {
  return `${BASE_URL}/api/v1/files/${filePath}`;
}

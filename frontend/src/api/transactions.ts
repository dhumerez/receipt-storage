import { apiClient } from './client.ts';

const BASE_URL = import.meta.env.VITE_API_URL ?? '';

export interface TransactionLineItem {
  id: string;
  productId: string | null;
  description: string;
  quantity: string;
  unitPrice: string;
  lineTotal: string;
}

export interface TransactionListItem {
  id: string;
  referenceNumber: string;
  clientName: string;
  totalAmount: string;
  initialPayment: string;
  status: 'draft' | 'pending_approval' | 'active' | 'voided' | 'written_off';
  deliveredAt: string | null;
  submittedBy: string;
  createdAt: string;
}

export interface DocumentInfo {
  id: string;
  filePath: string;
  originalName: string;
  mimeType: string;
  fileSizeBytes: number;
}

export interface TransactionDetail extends TransactionListItem {
  clientId: string;
  description: string | null;
  clientNotes: string | null;
  internalNotes: string | null;
  items: TransactionLineItem[];
  documents: DocumentInfo[];
}

export interface CreateTransactionInput {
  clientId: string;
  description?: string;
  deliveredAt?: string;
  initialPayment: string;
  clientNotes?: string;
  internalNotes?: string;
  items: Array<{
    productId?: string;
    description: string;
    quantity: string;
    unitPrice: string;
  }>;
}

export function createTransaction(
  input: CreateTransactionInput,
  files: File[],
): Promise<TransactionDetail> {
  const formData = new FormData();
  formData.append('data', JSON.stringify(input));
  files.forEach((f) => formData.append('files', f));

  // CRITICAL: pass headers: {} to override apiClient's default Content-Type
  // so browser sets multipart boundary automatically
  return apiClient<TransactionDetail>('/api/v1/transactions', {
    method: 'POST',
    body: formData,
    headers: {},
  });
}

export function getTransactions(params: {
  search?: string;
  clientId?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
}): Promise<TransactionListItem[]> {
  const qs = new URLSearchParams();
  if (params.search) qs.set('search', params.search);
  if (params.clientId) qs.set('clientId', params.clientId);
  if (params.status) qs.set('status', params.status);
  if (params.dateFrom) qs.set('dateFrom', params.dateFrom);
  if (params.dateTo) qs.set('dateTo', params.dateTo);
  return apiClient<TransactionListItem[]>(`/api/v1/transactions?${qs.toString()}`);
}

export function getTransaction(id: string): Promise<TransactionDetail> {
  return apiClient<TransactionDetail>(`/api/v1/transactions/${id}`);
}

export function getFileUrl(filePath: string): string {
  return `${BASE_URL}/api/v1/files/${filePath}`;
}

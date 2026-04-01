import { apiClient, getAccessToken } from './client.ts';

export interface CompanyReportRow {
  clientId: string;
  clientName: string;
  totalDebts: string;
  totalPaid: string;
  outstandingBalance: string;
}

export interface ClientReportData {
  client: { id: string; fullName: string; email: string; phone: string };
  transactions: Array<{
    id: string;
    referenceNumber: string;
    deliveredAt: string;
    description: string;
    totalAmount: string;
    items: Array<{ name: string; quantity: number; unitPrice: string; total: string }>;
    debt?: {
      totalAmount: string;
      amountPaid: string;
      remainingBalance: string;
      status: string;
      payments: Array<{
        amount: string;
        paidAt: string;
        paymentMethod: string;
        reference?: string;
        status: string;
      }>;
    };
  }>;
}

export function fetchCompanyReport(dateFrom: string, dateTo: string, showSettled: boolean) {
  return apiClient<CompanyReportRow[]>(
    `/api/v1/reports/company?dateFrom=${dateFrom}&dateTo=${dateTo}&showSettled=${showSettled}`,
  );
}

export function fetchClientReport(clientId: string, dateFrom: string, dateTo: string) {
  return apiClient<ClientReportData>(
    `/api/v1/reports/client/${clientId}?dateFrom=${dateFrom}&dateTo=${dateTo}`,
  );
}

export async function downloadPdf(path: string, filename: string) {
  const baseUrl = import.meta.env.VITE_API_URL ?? '';
  const token = getAccessToken();
  const response = await fetch(`${baseUrl}${path}`, {
    credentials: 'include',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!response.ok) throw new Error('PDF generation failed. Please try again.');
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function uploadLogo(file: File) {
  const formData = new FormData();
  formData.append('logo', file);
  return apiClient<{ logoPath: string }>('/api/v1/reports/logo', {
    method: 'POST',
    body: formData,
    headers: {},
  });
}

export function deleteLogo() {
  return apiClient('/api/v1/reports/logo', { method: 'DELETE' });
}

export function getLogoUrl(): string {
  return `${import.meta.env.VITE_API_URL ?? ''}/api/v1/reports/logo`;
}

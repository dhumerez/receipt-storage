import { apiClient } from './client.ts';

export interface ProductListItem {
  id: string;
  name: string;
  unitPrice: string;   // NUMERIC from DB is a string — NEVER parseFloat for storage/comparison
  unit: string | null;
  description: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface Product extends ProductListItem {
  companyId: string;
  updatedAt: string;
}

export interface CreateProductInput {
  name: string;
  unitPrice: string;   // send as parseFloat(value).toFixed(2) string
  unit?: string;
  description?: string;
}

export function getProducts(params: { search?: string; status?: string }): Promise<ProductListItem[]> {
  const qs = new URLSearchParams();
  if (params.search) qs.set('search', params.search);
  if (params.status) qs.set('status', params.status);
  return apiClient<ProductListItem[]>(`/api/v1/products?${qs.toString()}`);
}

export function createProduct(input: CreateProductInput): Promise<Product> {
  return apiClient<Product>('/api/v1/products', { method: 'POST', json: input });
}

export function updateProduct(id: string, input: Partial<CreateProductInput>): Promise<Product> {
  return apiClient<Product>(`/api/v1/products/${id}`, { method: 'PATCH', json: input });
}

export function deactivateProduct(id: string): Promise<void> {
  return apiClient<void>(`/api/v1/products/${id}/deactivate`, { method: 'PATCH' });
}

export function reactivateProduct(id: string): Promise<void> {
  return apiClient<void>(`/api/v1/products/${id}/reactivate`, { method: 'PATCH' });
}

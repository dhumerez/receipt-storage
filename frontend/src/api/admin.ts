import { apiClient } from './client.ts';

export interface Company {
  id: string;
  name: string;
  currencyCode: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  ownerEmail: string | null;
}

export interface CompanyOwner {
  id: string;
  email: string;
  fullName: string;
  role: string;
}

export interface CompanyWithOwner extends Company {
  owner: CompanyOwner | null;
}

export interface CreateCompanyInput {
  name: string;
  currencyCode: string;
}

export interface UpdateCompanyInput {
  name?: string;
  currencyCode?: string;
  isActive?: boolean;
}

export interface CreateOwnerInput {
  email: string;
  password: string;
  fullName: string;
}

export function getCompanies(): Promise<Company[]> {
  return apiClient<Company[]>('/admin/companies');
}

export function getCompany(id: string): Promise<CompanyWithOwner> {
  return apiClient<CompanyWithOwner>(`/admin/companies/${id}`);
}

export function createCompany(input: CreateCompanyInput): Promise<Company> {
  return apiClient<Company>('/admin/companies', { method: 'POST', json: input });
}

export function updateCompany(id: string, input: UpdateCompanyInput): Promise<Company> {
  return apiClient<Company>(`/admin/companies/${id}`, { method: 'PATCH', json: input });
}

export function createOwner(companyId: string, input: CreateOwnerInput): Promise<{ id: string; email: string; role: string }> {
  return apiClient<{ id: string; email: string; role: string }>(`/admin/companies/${companyId}/owner`, { method: 'POST', json: input });
}

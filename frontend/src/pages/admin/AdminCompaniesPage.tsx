import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getCompanies, createCompany } from '../../api/admin.ts';
import type { CreateCompanyInput } from '../../api/admin.ts';
import SearchBar from '../../components/common/SearchBar.tsx';
import EmptyState from '../../components/common/EmptyState.tsx';
import { ADMIN } from '../../constants/strings/admin.ts';

export default function AdminCompaniesPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);

  // 300ms debounce
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const { data: companies = [], isLoading, error } = useQuery({
    queryKey: ['admin-companies'],
    queryFn: getCompanies,
    staleTime: 30_000,
  });

  const filtered = companies.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()),
  );

  const createMutation = useMutation({
    mutationFn: (input: CreateCompanyInput) => createCompany(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-companies'] });
      setModalOpen(false);
    },
  });

  if (isLoading) {
    return <div className="p-8 text-gray-500">{ADMIN.loading}</div>;
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{ADMIN.pageTitle}</h1>
        <button
          onClick={() => setModalOpen(true)}
          className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 font-medium"
        >
          {ADMIN.createCompany}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
          {ADMIN.errorLoading}
        </div>
      )}

      {/* Search */}
      <div className="mb-4">
        <SearchBar value={searchInput} onChange={setSearchInput} placeholder={ADMIN.searchPlaceholder} />
      </div>

      {/* Table or empty */}
      {filtered.length === 0 ? (
        <EmptyState
          heading={ADMIN.noCompanies}
          body={ADMIN.noCompaniesBody}
          ctaLabel={ADMIN.createCompany}
          onCta={() => setModalOpen(true)}
        />
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{ADMIN.thName}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{ADMIN.thCurrency}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{ADMIN.thStatus}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{ADMIN.thOwner}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{ADMIN.thCreated}</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filtered.map((company) => (
                <tr
                  key={company.id}
                  onClick={() => navigate(`/admin/companies/${company.id}`)}
                  className="hover:bg-gray-50 cursor-pointer"
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{company.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{company.currencyCode}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      company.isActive
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {company.isActive ? ADMIN.active : ADMIN.inactive}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {company.ownerEmail ?? ADMIN.noOwner}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(company.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Company Modal */}
      {modalOpen && (
        <CreateCompanyModal
          onClose={() => { setModalOpen(false); createMutation.reset(); }}
          onSubmit={(data) => createMutation.mutate(data)}
          isSubmitting={createMutation.isPending}
          error={createMutation.error?.message}
        />
      )}
    </div>
  );
}

/* ── Create Company Modal ── */

interface CreateCompanyModalProps {
  onClose: () => void;
  onSubmit: (data: CreateCompanyInput) => void;
  isSubmitting: boolean;
  error?: string;
}

function CreateCompanyModal({ onClose, onSubmit, isSubmitting, error }: CreateCompanyModalProps) {
  const [name, setName] = useState('');
  const [currencyCode, setCurrencyCode] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ name: name.trim(), currencyCode: currencyCode.trim().toUpperCase() });
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6 mx-4">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">{ADMIN.createCompany}</h2>
        {error && (
          <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">{error}</div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{ADMIN.companyName}</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={255}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{ADMIN.currencyCode}</label>
            <input
              type="text"
              value={currencyCode}
              onChange={(e) => setCurrencyCode(e.target.value)}
              required
              maxLength={3}
              minLength={3}
              placeholder="BOB"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="mt-1 text-xs text-gray-500">{ADMIN.currencyCodeHint}</p>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 font-medium"
            >
              {ADMIN.cancel}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 font-medium"
            >
              {isSubmitting ? ADMIN.loading : ADMIN.createCompany}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

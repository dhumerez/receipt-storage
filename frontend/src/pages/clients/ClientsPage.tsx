import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { getClients } from '../../api/clients.ts';
import { CLIENTS } from '../../constants/strings/clients.ts';
import ClientTable from '../../components/clients/ClientTable.tsx';
import ClientModal from '../../components/clients/ClientModal.tsx';
import DeactivateConfirmModal from '../../components/clients/DeactivateConfirmModal.tsx';
import SearchBar from '../../components/common/SearchBar.tsx';
import StatusFilterToggle from '../../components/common/StatusFilterToggle.tsx';
import EmptyState from '../../components/common/EmptyState.tsx';
import type { Client, ClientListItem } from '../../api/clients.ts';

export default function ClientsPage() {
  const navigate = useNavigate();
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');           // debounced value
  const [status, setStatus] = useState<'all' | 'active' | 'inactive'>('active');
  const [modalOpen, setModalOpen] = useState(false);
  const [editClient, setEditClient] = useState<Client | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<ClientListItem | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // 300ms debounce on search input (UI-SPEC)
  useEffect(() => {
    if (debounceRef.current !== undefined) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setSearch(searchInput), 300);
    return () => { if (debounceRef.current !== undefined) clearTimeout(debounceRef.current); };
  }, [searchInput]);

  const { data: clients = [], isLoading, error } = useQuery({
    queryKey: ['clients', { search, status }],
    queryFn: () => getClients({ search, status }),
    staleTime: 30_000,
  });

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="text-sm text-gray-400">{CLIENTS.loadingClients}</div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">{CLIENTS.pageTitle}</h1>
        <button
          type="button"
          onClick={() => { setEditClient(null); setModalOpen(true); }}
          className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
        >
          {CLIENTS.addClient}
        </button>
      </div>

      {/* Error banner */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
          {CLIENTS.errorLoadingClients}
        </div>
      )}

      {/* Search + Filter */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="flex-1">
          <SearchBar
            value={searchInput}
            onChange={setSearchInput}
            placeholder={CLIENTS.searchPlaceholder}
          />
        </div>
        <StatusFilterToggle value={status} onChange={setStatus} />
      </div>

      {/* Table or empty state */}
      {clients.length === 0 ? (
        <EmptyState
          heading={status === 'inactive' ? CLIENTS.noInactiveClients : CLIENTS.noClientsYet}
          body={
            status === 'inactive'
              ? CLIENTS.deactivatedClientsAppearHere
              : CLIENTS.addFirstClient
          }
          ctaLabel={status !== 'inactive' ? CLIENTS.addClient : undefined}
          onCta={status !== 'inactive' ? () => { setEditClient(null); setModalOpen(true); } : undefined}
        />
      ) : (
        <ClientTable
          clients={clients}
          onRowClick={(id) => navigate(`/clients/${id}`)}
        />
      )}

      {/* Create/Edit Modal */}
      <ClientModal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setEditClient(null); }}
        editData={editClient}
      />

      {/* Deactivate Confirm Modal */}
      {deactivateTarget && (
        <DeactivateConfirmModal
          isOpen={true}
          clientId={deactivateTarget.id}
          clientName={deactivateTarget.fullName}
          onClose={() => setDeactivateTarget(null)}
        />
      )}
    </div>
  );
}

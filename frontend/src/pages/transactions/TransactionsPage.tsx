import { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { getTransactions } from '../../api/transactions.ts';
import { getClients } from '../../api/clients.ts';
import { useAuth } from '../../contexts/AuthContext.tsx';
import TransactionTable from '../../components/transactions/TransactionTable.tsx';
import SearchBar from '../../components/common/SearchBar.tsx';
import EmptyState from '../../components/common/EmptyState.tsx';
import { TRANSACTIONS } from '../../constants/strings/transactions.ts';
import { COMMON } from '../../constants/strings/common.ts';

type StatusFilter = 'all' | 'pending_approval' | 'active' | 'voided';

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: TRANSACTIONS.statusAll },
  { value: 'pending_approval', label: TRANSACTIONS.statusPending },
  { value: 'active', label: TRANSACTIONS.statusActive },
  { value: 'voided', label: TRANSACTIONS.statusVoided },
];

export default function TransactionsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [clientFilter, setClientFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // 300ms debounce on search input
  useEffect(() => {
    if (debounceRef.current !== undefined) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setSearch(searchInput), 300);
    return () => {
      if (debounceRef.current !== undefined) clearTimeout(debounceRef.current);
    };
  }, [searchInput]);

  const { data: transactions = [], isLoading, error } = useQuery({
    queryKey: ['transactions', { search, status: statusFilter, clientId: clientFilter, dateFrom, dateTo }],
    queryFn: () =>
      getTransactions({
        search: search || undefined,
        clientId: clientFilter || undefined,
        status: statusFilter === 'all' ? undefined : statusFilter,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      }),
    staleTime: 30_000,
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => getClients({}),
    staleTime: 60_000,
  });

  const canCreate = user?.role === 'owner' || user?.role === 'collaborator';

  // Determine the status label for empty state
  const statusLabel =
    statusFilter === 'pending_approval'
      ? 'pending'
      : statusFilter === 'all'
      ? ''
      : statusFilter;

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="text-sm text-gray-400">{TRANSACTIONS.loadingTransactions}</div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">{TRANSACTIONS.pageTitle}</h1>
        {canCreate && (
          <button
            type="button"
            onClick={() => navigate('/transactions/new')}
            className="bg-blue-600 text-white hover:bg-blue-700 px-4 py-2 rounded-md text-sm font-semibold"
          >
            {TRANSACTIONS.newTransaction}
          </button>
        )}
      </div>

      {/* Error banner */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
          {TRANSACTIONS.errorLoadingTransactions}
        </div>
      )}

      {/* Filter row */}
      <div className="flex flex-wrap gap-2 mb-4">
        <div className="flex-1 min-w-[200px]">
          <SearchBar
            value={searchInput}
            onChange={setSearchInput}
            placeholder={TRANSACTIONS.searchPlaceholder}
          />
        </div>

        {/* Status segmented filter */}
        <div className="flex rounded-md border border-gray-300 overflow-hidden">
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setStatusFilter(opt.value)}
              className={`px-3 py-1.5 text-sm border-r last:border-r-0 border-gray-300 ${
                statusFilter === opt.value
                  ? 'bg-gray-100 text-gray-900 font-semibold'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Client filter */}
        <select
          value={clientFilter}
          onChange={(e) => setClientFilter(e.target.value)}
          className="border border-gray-300 rounded-md px-3 py-1.5 text-sm"
        >
          <option value="">{TRANSACTIONS.allClients}</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.fullName}
            </option>
          ))}
        </select>

        {/* Date range */}
        <div className="flex items-center gap-1">
          <label className="text-sm text-gray-500">{COMMON.from}</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-1.5 text-sm"
          />
        </div>
        <div className="flex items-center gap-1">
          <label className="text-sm text-gray-500">{COMMON.to}</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-1.5 text-sm"
          />
        </div>
      </div>

      {/* Table or empty state */}
      {transactions.length === 0 ? (
        search ? (
          <EmptyState
            heading={TRANSACTIONS.noTransactionsMatchSearch}
            body={TRANSACTIONS.tryDifferentFilters}
          />
        ) : statusFilter !== 'all' ? (
          <EmptyState
            heading={TRANSACTIONS.noStatusTransactions(statusLabel)}
            body={TRANSACTIONS.transactionsWithStatusAppearHere}
          />
        ) : (
          <EmptyState
            heading={TRANSACTIONS.noTransactionsYet}
            body={TRANSACTIONS.createFirstTransaction}
            ctaLabel={canCreate ? TRANSACTIONS.newTransaction : undefined}
            onCta={canCreate ? () => navigate('/transactions/new') : undefined}
          />
        )
      ) : (
        <TransactionTable transactions={transactions} />
      )}
    </div>
  );
}

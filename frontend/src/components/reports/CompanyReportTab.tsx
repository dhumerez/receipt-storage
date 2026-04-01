import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchCompanyReport } from '../../api/reports.ts';
import type { CompanyReportRow } from '../../api/reports.ts';
import SortableHeader from './SortableHeader.tsx';
import EmptyState from '../common/EmptyState.tsx';

interface CompanyReportTabProps {
  dateFrom: string;
  dateTo: string;
  showSettled: boolean;
}

type SortKey = keyof CompanyReportRow;

export default function CompanyReportTab({
  dateFrom,
  dateTo,
  showSettled,
}: CompanyReportTabProps) {
  const [sortKey, setSortKey] = useState<SortKey>('outstandingBalance');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const {
    data: rows = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['companyReport', dateFrom, dateTo],
    queryFn: () => fetchCompanyReport(dateFrom, dateTo, showSettled),
    staleTime: 30_000,
  });

  function handleSort(key: string) {
    if (key === sortKey) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key as SortKey);
      setSortDir('desc');
    }
  }

  const filtered = useMemo(() => {
    if (showSettled) return rows;
    return rows.filter((r) => parseFloat(r.outstandingBalance) !== 0);
  }, [rows, showSettled]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (sortKey === 'clientName') {
        const cmp = aVal.localeCompare(bVal);
        return sortDir === 'asc' ? cmp : -cmp;
      }
      const cmp = parseFloat(aVal) - parseFloat(bVal);
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [filtered, sortKey, sortDir]);

  if (isLoading) {
    return (
      <div className="py-8 text-center text-sm text-gray-400">
        Loading report...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
        Failed to load report data. Check your connection and try again.
      </div>
    );
  }

  if (sorted.length === 0) {
    return (
      <EmptyState
        heading="No outstanding balances"
        body="No clients have outstanding balances in the selected date range. Try adjusting the date range or enabling settled clients."
      />
    );
  }

  return (
    <div className="overflow-x-auto">
      <div className="w-full border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50">
              <SortableHeader
                label="Client Name"
                sortKey="clientName"
                activeSortKey={sortKey}
                sortDir={sortDir}
                onSort={handleSort}
              />
              <SortableHeader
                label="Total Debts"
                sortKey="totalDebts"
                activeSortKey={sortKey}
                sortDir={sortDir}
                onSort={handleSort}
              />
              <SortableHeader
                label="Total Paid"
                sortKey="totalPaid"
                activeSortKey={sortKey}
                sortDir={sortDir}
                onSort={handleSort}
              />
              <SortableHeader
                label="Outstanding Balance"
                sortKey="outstandingBalance"
                activeSortKey={sortKey}
                sortDir={sortDir}
                onSort={handleSort}
              />
            </tr>
          </thead>
          <tbody>
            {sorted.map((row) => (
              <tr
                key={row.clientId}
                className="border-t border-gray-100 hover:bg-gray-50"
              >
                <td className="px-4 py-3 text-sm text-gray-900">
                  {row.clientName}
                </td>
                <td className="px-4 py-3 text-sm text-gray-900 text-right">
                  ${row.totalDebts}
                </td>
                <td className="px-4 py-3 text-sm text-gray-900 text-right">
                  ${row.totalPaid}
                </td>
                <td className="px-4 py-3 text-sm text-gray-900 text-right font-semibold">
                  ${row.outstandingBalance}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

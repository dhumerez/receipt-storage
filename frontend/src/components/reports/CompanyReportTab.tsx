import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchCompanyReport } from '../../api/reports.ts';
import type { CompanyReportRow } from '../../api/reports.ts';
import SortableHeader from './SortableHeader.tsx';
import EmptyState from '../common/EmptyState.tsx';
import { REPORTS } from '../../constants/strings/reports.ts';

interface CompanyReportTabProps {
  dateFrom: string;
  dateTo: string;
  showSettled: boolean;
}

type SortKey = keyof CompanyReportRow;

export default function CompanyReportTab({ dateFrom, dateTo, showSettled }: CompanyReportTabProps) {
  const [sortKey, setSortKey] = useState<SortKey>('outstandingBalance');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['companyReport', dateFrom, dateTo],
    queryFn: () => fetchCompanyReport(dateFrom, dateTo, showSettled),
  });

  const handleSort = (key: string) => {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key as SortKey);
      setSortDir('desc');
    }
  };

  const sortedData = useMemo(() => {
    if (!data) return [];

    const filtered = showSettled
      ? data
      : data.filter((row) => parseFloat(row.outstandingBalance) !== 0);

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
  }, [data, sortKey, sortDir, showSettled]);

  if (isLoading) {
    return <p className="text-sm text-gray-500 py-8 text-center">{REPORTS.loadingReport}</p>;
  }

  if (isError || sortedData.length === 0) {
    return (
      <EmptyState
        heading={REPORTS.noRecordsYet}
        body={REPORTS.noRecordsYetBody}
      />
    );
  }

  return (
    <div className="overflow-x-auto">
      <div className="w-full border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50">
              <SortableHeader label={REPORTS.thClientName} sortKey="clientName" activeSortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
              <SortableHeader label={REPORTS.thTotalDebts} sortKey="totalDebts" activeSortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
              <SortableHeader label={REPORTS.thTotalPaid} sortKey="totalPaid" activeSortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
              <SortableHeader label={REPORTS.thOutstandingBalance} sortKey="outstandingBalance" activeSortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
            </tr>
          </thead>
          <tbody>
            {sortedData.map((row) => (
              <tr key={row.clientId} className="border-t border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-3 text-sm text-gray-900">{row.clientName}</td>
                <td className="px-4 py-3 text-sm text-gray-900 text-right">${row.totalDebts}</td>
                <td className="px-4 py-3 text-sm text-gray-900 text-right">${row.totalPaid}</td>
                <td className="px-4 py-3 text-sm text-gray-900 text-right font-semibold">${row.outstandingBalance}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

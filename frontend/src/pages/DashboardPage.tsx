import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router';
import { fetchCompanyReport } from '../api/reports.ts';
import { getTransactions } from '../api/transactions.ts';
import TransactionStatusBadge from '../components/transactions/TransactionStatusBadge.tsx';
import EmptyState from '../components/common/EmptyState.tsx';
import KpiCard from '../components/dashboard/KpiCard.tsx';
import { DASHBOARD } from '../constants/strings/dashboard.ts';

function defaultDateFrom(): string {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d.toISOString().slice(0, 10);
}

const today = new Date().toISOString().slice(0, 10);
const thirtyDaysAgo = defaultDateFrom();

function fmtMoney(value: number): string {
  return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function DashboardPage() {
  const companyReport = useQuery({
    queryKey: ['dashboard', 'companyReport'],
    queryFn: () => fetchCompanyReport(thirtyDaysAgo, today, false),
  });

  const pendingTx = useQuery({
    queryKey: ['dashboard', 'pendingApprovals'],
    queryFn: () => getTransactions({ status: 'pending_approval' }),
  });

  const recentTx = useQuery({
    queryKey: ['dashboard', 'recentTransactions'],
    queryFn: () => getTransactions({}),
  });

  const { totalOutstanding, totalCollected, clientsWithBalance, topDebtors } = useMemo(() => {
    const rows = companyReport.data ?? [];
    let outstanding = 0;
    let collected = 0;
    for (const r of rows) {
      outstanding += parseFloat(r.outstandingBalance) || 0;
      collected += parseFloat(r.totalPaid) || 0;
    }
    const sorted = [...rows].sort(
      (a, b) => (parseFloat(b.outstandingBalance) || 0) - (parseFloat(a.outstandingBalance) || 0),
    );
    return {
      totalOutstanding: outstanding,
      totalCollected: collected,
      clientsWithBalance: rows.length,
      topDebtors: sorted.slice(0, 5),
    };
  }, [companyReport.data]);

  const pendingCount = pendingTx.data?.length ?? 0;
  const recentTransactions = useMemo(() => (recentTx.data ?? []).slice(0, 5), [recentTx.data]);

  return (
    <div className="p-4 md:p-6 space-y-6">
      <h1 className="text-xl font-semibold text-gray-900">{DASHBOARD.pageTitle}</h1>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard
          label={DASHBOARD.totalOutstanding}
          value={companyReport.isLoading ? '...' : fmtMoney(totalOutstanding)}
          accent="blue"
        />
        <KpiCard
          label={DASHBOARD.totalCollected}
          value={companyReport.isLoading ? '...' : fmtMoney(totalCollected)}
          accent="green"
        />
        <KpiCard
          label={DASHBOARD.clientsWithBalance}
          value={companyReport.isLoading ? '...' : String(clientsWithBalance)}
          accent="gray"
        />
        <KpiCard
          label={DASHBOARD.pendingApprovals}
          value={pendingTx.isLoading ? '...' : String(pendingCount)}
          accent="yellow"
        />
      </div>

      {/* Two-column: Top Debtors + Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Debtors */}
        <div className="rounded-lg border border-gray-200 bg-white">
          <div className="flex items-center justify-between p-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">{DASHBOARD.topDebtors}</h2>
            <Link to="/reports" className="text-sm text-blue-600 hover:text-blue-700">
              {DASHBOARD.viewReports}
            </Link>
          </div>
          {companyReport.isLoading ? (
            <div className="p-4 text-sm text-gray-500">...</div>
          ) : topDebtors.length === 0 ? (
            <EmptyState heading={DASHBOARD.noDebtors} body={DASHBOARD.noDebtorsBody} />
          ) : (
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {DASHBOARD.thClient}
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {DASHBOARD.thBalance}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {topDebtors.map((row) => (
                  <tr key={row.clientId} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">
                      <Link to={`/clients/${row.clientId}`} className="hover:text-blue-600">
                        {row.clientName}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 text-right font-semibold">
                      {fmtMoney(parseFloat(row.outstandingBalance) || 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Recent Transactions */}
        <div className="rounded-lg border border-gray-200 bg-white">
          <div className="flex items-center justify-between p-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">{DASHBOARD.recentTransactions}</h2>
            <Link to="/transactions" className="text-sm text-blue-600 hover:text-blue-700">
              {DASHBOARD.viewAll}
            </Link>
          </div>
          {recentTx.isLoading ? (
            <div className="p-4 text-sm text-gray-500">...</div>
          ) : recentTransactions.length === 0 ? (
            <EmptyState
              heading={DASHBOARD.noRecentTransactions}
              body={DASHBOARD.noRecentTransactionsBody}
            />
          ) : (
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {DASHBOARD.thRef}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {DASHBOARD.thClient}
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {DASHBOARD.thAmount}
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {DASHBOARD.thStatus}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {recentTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">
                      <Link to={`/transactions/${tx.id}`} className="hover:text-blue-600">
                        {tx.referenceNumber}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">{tx.clientName}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 text-right font-semibold">
                      {fmtMoney(parseFloat(tx.totalAmount) || 0)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <TransactionStatusBadge status={tx.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Pending Approvals (only if there are any) */}
      {pendingCount > 0 && (
        <div className="rounded-lg border border-gray-200 bg-white">
          <div className="flex items-center justify-between p-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">
              {DASHBOARD.pendingApprovalsSection}
            </h2>
            <Link
              to="/transactions"
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              {DASHBOARD.viewAll}
            </Link>
          </div>
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {DASHBOARD.thRef}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {DASHBOARD.thClient}
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {DASHBOARD.thAmount}
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {DASHBOARD.thDate}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {pendingTx.data!.map((tx) => (
                <tr key={tx.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-900">
                    <Link to={`/transactions/${tx.id}`} className="hover:text-blue-600">
                      {tx.referenceNumber}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">{tx.clientName}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 text-right font-semibold">
                    {fmtMoney(parseFloat(tx.totalAmount) || 0)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500 text-right">
                    {tx.createdAt ? new Date(tx.createdAt).toLocaleDateString() : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

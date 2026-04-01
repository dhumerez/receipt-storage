import { useQuery } from '@tanstack/react-query';
import { fetchClientReport } from '../../api/reports.ts';
import EmptyState from '../common/EmptyState.tsx';

interface ClientReportTabProps {
  dateFrom: string;
  dateTo: string;
  selectedClientId: string;
  onClientSelect: (id: string) => void;
}

export default function ClientReportTab({
  dateFrom,
  dateTo,
  selectedClientId,
}: ClientReportTabProps) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['clientReport', selectedClientId, dateFrom, dateTo],
    queryFn: () => fetchClientReport(selectedClientId, dateFrom, dateTo),
    enabled: !!selectedClientId,
  });

  if (!selectedClientId) {
    return (
      <EmptyState
        heading="Select a client"
        body="Choose a client from the dropdown above to view their transaction and payment history."
      />
    );
  }

  if (isLoading) {
    return <p className="text-sm text-gray-500 py-8 text-center">Loading report...</p>;
  }

  if (isError) {
    return (
      <p className="text-sm text-red-600 py-8 text-center">
        Failed to load report data. Check your connection and try again.
      </p>
    );
  }

  if (!data || data.transactions.length === 0) {
    return (
      <EmptyState
        heading="No transactions found"
        body="This client has no transactions in the selected date range. Try adjusting the dates."
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Client info */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h3 className="text-xl font-semibold text-gray-900">{data.client.fullName}</h3>
        {data.client.email && <p className="text-sm text-gray-500">{data.client.email}</p>}
        {data.client.phone && <p className="text-sm text-gray-500">{data.client.phone}</p>}
      </div>

      {/* Transactions table */}
      <div className="overflow-x-auto">
        <div className="w-full border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-4 py-3 text-left text-xs uppercase tracking-wider text-gray-500">Ref #</th>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-wider text-gray-500">Date</th>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-wider text-gray-500">Description</th>
                <th className="px-4 py-3 text-right text-xs uppercase tracking-wider text-gray-500">Total</th>
              </tr>
            </thead>
            <tbody>
              {data.transactions.map((txn) => (
                <tr key={txn.id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-900">{txn.referenceNumber}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {new Date(txn.deliveredAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">{txn.description}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 text-right">${txn.totalAmount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Per-debt sections with payment sub-tables */}
      {data.transactions
        .filter((txn) => txn.debt)
        .map((txn) => (
          <div key={`debt-${txn.id}`} className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
            <div className="flex flex-wrap justify-between items-center gap-2">
              <h4 className="text-sm font-semibold text-gray-900">
                Debt for {txn.referenceNumber}
              </h4>
              <span className="text-xs uppercase tracking-wider text-gray-500">
                {txn.debt!.status.replace('_', ' ')}
              </span>
            </div>
            <div className="flex flex-wrap gap-4 text-sm">
              <span className="text-gray-500">
                Total: <span className="text-gray-900">${txn.debt!.totalAmount}</span>
              </span>
              <span className="text-gray-500">
                Paid: <span className="text-gray-900">${txn.debt!.amountPaid}</span>
              </span>
              <span className="text-gray-500">
                Remaining: <span className="text-gray-900 font-semibold">${txn.debt!.remainingBalance}</span>
              </span>
            </div>

            {txn.debt!.payments.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-3 py-2 text-left text-xs uppercase tracking-wider text-gray-500">Amount</th>
                      <th className="px-3 py-2 text-left text-xs uppercase tracking-wider text-gray-500">Date</th>
                      <th className="px-3 py-2 text-left text-xs uppercase tracking-wider text-gray-500">Method</th>
                      <th className="px-3 py-2 text-left text-xs uppercase tracking-wider text-gray-500">Reference</th>
                      <th className="px-3 py-2 text-left text-xs uppercase tracking-wider text-gray-500">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {txn.debt!.payments.map((pmt, idx) => (
                      <tr key={idx} className="border-t border-gray-100">
                        <td className="px-3 py-2 text-sm text-gray-900">${pmt.amount}</td>
                        <td className="px-3 py-2 text-sm text-gray-500">
                          {new Date(pmt.paidAt).toLocaleDateString()}
                        </td>
                        <td className="px-3 py-2 text-sm text-gray-500">{pmt.paymentMethod}</td>
                        <td className="px-3 py-2 text-sm text-gray-500">{pmt.reference ?? '—'}</td>
                        <td className="px-3 py-2 text-sm text-gray-500">{pmt.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ))}
    </div>
  );
}

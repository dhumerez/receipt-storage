import { Link, useParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { getClient, getClientDebts } from '../../api/clients.ts';
import ClientDetailHeader from '../../components/clients/ClientDetailHeader.tsx';
import BalanceSummary from '../../components/clients/BalanceSummary.tsx';
import DebtGroupList from '../../components/clients/DebtGroupList.tsx';

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();

  const {
    data: client,
    isLoading: clientLoading,
    error: clientError,
  } = useQuery({
    queryKey: ['client', id],
    queryFn: () => getClient(id!),
    enabled: !!id,
  });

  const { data: debtsData, isLoading: debtsLoading } = useQuery({
    queryKey: ['client', id, 'debts'],
    queryFn: () => getClientDebts(id!),
    enabled: !!id,
    staleTime: 30_000,
  });

  if (clientLoading || debtsLoading) {
    return (
      <div className="p-8">
        <div className="text-sm text-gray-400">Loading client...</div>
      </div>
    );
  }

  if (clientError || !client) {
    return (
      <div className="p-8">
        <div className="p-4 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
          Could not load client. Please refresh the page.
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Back link */}
      <Link
        to="/clients"
        className="inline-flex items-center text-sm text-blue-600 hover:underline mb-6"
      >
        &#8592; Clients
      </Link>

      <ClientDetailHeader client={client} />

      {debtsData && (
        <>
          <BalanceSummary
            balance={debtsData.client.outstandingBalance}
            asOf={debtsData.asOf}
          />
          <DebtGroupList debts={debtsData.debts} />
        </>
      )}
    </div>
  );
}

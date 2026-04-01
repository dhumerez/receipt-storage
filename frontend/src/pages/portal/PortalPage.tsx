import { useQuery } from '@tanstack/react-query';
import { getPortalSummary, getPortalDebts } from '../../api/portal.ts';
import PortalBalanceSummary from '../../components/portal/PortalBalanceSummary.tsx';
import PortalDebtGroup from '../../components/portal/PortalDebtGroup.tsx';
import EmptyState from '../../components/common/EmptyState.tsx';

// Client portal page — renders inside PortalLayout (top bar + centered max-w-2xl)
// FR-03.4: Only shows data for the logged-in client (clientId from JWT on backend)
// FR-03.7: internalNotes never rendered — not in PortalDebt type

export default function PortalPage() {
  const { data: summary, isLoading: summaryLoading, error: summaryError } = useQuery({
    queryKey: ['portal-summary'],
    queryFn: getPortalSummary,
    staleTime: 60_000,
  });

  const { data: debts = [], isLoading: debtsLoading } = useQuery({
    queryKey: ['portal-debts'],
    queryFn: getPortalDebts,
    staleTime: 60_000,
  });

  if (summaryLoading || debtsLoading) {
    return (
      <div className="py-8 text-center text-sm text-gray-400">Loading your account...</div>
    );
  }

  if (summaryError || !summary) {
    return (
      <div className="py-8">
        <div className="p-4 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
          Could not load your account. Please refresh the page.
        </div>
      </div>
    );
  }

  // FR-10.4: Compute total paid across all debts for personal summary
  const totalPaid = debts
    .reduce((sum, d) => sum + parseFloat(d.amountPaid), 0)
    .toFixed(2);

  return (
    <div>
      <PortalBalanceSummary summary={summary} totalPaid={totalPaid} />

      {debts.length === 0 ? (
        <EmptyState
          heading="No transactions yet"
          body="Your account is up to date. Transactions will appear here once recorded."
        />
      ) : (
        <PortalDebtGroup debts={debts} />
      )}
    </div>
  );
}

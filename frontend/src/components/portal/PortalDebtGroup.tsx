import type { PortalDebt } from '../../api/portal.ts';
import PortalTransactionRow from './PortalTransactionRow.tsx';

interface PortalDebtGroupProps {
  debts: PortalDebt[];
}

// D-12: Portal groups transactions by debt status — Open / Partially Paid / Fully Paid
// FR-03.7: internalNotes never passed through — components only receive PortalDebt shape

const GROUPS: { status: PortalDebt['status']; label: string; badgeClass: string }[] = [
  { status: 'open', label: 'Open', badgeClass: 'bg-green-100 text-green-800' },
  { status: 'partially_paid', label: 'Partially Paid', badgeClass: 'bg-blue-100 text-blue-700' },
  { status: 'fully_paid', label: 'Fully Paid', badgeClass: 'bg-green-100 text-green-800' },
];

export default function PortalDebtGroup({ debts }: PortalDebtGroupProps) {
  const hasAnyDebts = debts.length > 0;

  if (!hasAnyDebts) {
    return null; // Empty state handled in PortalPage
  }

  return (
    <div className="space-y-6">
      {GROUPS.map(({ status, label, badgeClass }) => {
        const groupDebts = debts.filter((d) => d.status === status);
        if (groupDebts.length === 0) return null;

        return (
          <section key={status}>
            <div className="flex items-center gap-2 mb-3">
              <h2 className="text-sm font-medium text-gray-700">{label}</h2>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${badgeClass}`}>
                {groupDebts.length}
              </span>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg px-4">
              {groupDebts.map((debt) => (
                <PortalTransactionRow key={debt.id} debt={debt} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

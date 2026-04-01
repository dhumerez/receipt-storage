import type { DebtItem } from '../../api/clients.ts';
import DebtCard from './DebtCard.tsx';
import { CLIENTS } from '../../constants/strings/clients.ts';

interface DebtGroupListProps {
  debts: DebtItem[];
}

const GROUPS: { status: DebtItem['status']; label: string }[] = [
  { status: 'open', label: CLIENTS.openDebts },
  { status: 'partially_paid', label: CLIENTS.partiallyPaid },
  { status: 'fully_paid', label: CLIENTS.fullyPaid },
];

export default function DebtGroupList({ debts }: DebtGroupListProps) {
  if (debts.length === 0) {
    return (
      <div className="text-center py-12 text-sm text-gray-400">
        {CLIENTS.noDebtsRecorded}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {GROUPS.map(({ status, label }) => {
        const groupDebts = debts.filter((d) => d.status === status);
        if (groupDebts.length === 0) return null;

        return (
          <section key={status}>
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">
              {label} <span className="text-gray-400 font-normal">({groupDebts.length})</span>
            </h3>
            <div className="space-y-3">
              {groupDebts.map((debt) => (
                <DebtCard key={debt.id} debt={debt} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

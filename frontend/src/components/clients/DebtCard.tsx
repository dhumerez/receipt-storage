import { Link } from 'react-router';
import type { DebtItem } from '../../api/clients.ts';
import { CLIENTS } from '../../constants/strings/clients.ts';
import { DEBTS } from '../../constants/strings/debts.ts';

const STATUS_LABELS: Record<DebtItem['status'], string> = {
  open: DEBTS.statusOpen,
  partially_paid: DEBTS.statusPartiallyPaid,
  fully_paid: DEBTS.statusFullyPaid,
  written_off: DEBTS.statusWrittenOff,
};

const STATUS_CLASSES: Record<DebtItem['status'], string> = {
  open: 'bg-green-100 text-green-800',
  partially_paid: 'bg-blue-100 text-blue-700',
  fully_paid: 'bg-green-100 text-green-800',
  written_off: 'bg-gray-100 text-gray-600',
};

interface DebtCardProps {
  debt: DebtItem;
}

export default function DebtCard({ debt }: DebtCardProps) {
  const remainingBalance = parseFloat(debt.remainingBalance);

  return (
    <Link to={`/debts/${debt.id}`} className="block">
    <div className="bg-white border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors">
      <div className="flex items-center justify-between mb-3">
        <span
          aria-label={`Status: ${STATUS_LABELS[debt.status]}`}
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_CLASSES[debt.status]}`}
        >
          {STATUS_LABELS[debt.status]}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-4 text-sm">
        <div>
          <p className="text-gray-500 text-xs mb-0.5">{CLIENTS.original}</p>
          <p className="font-medium text-gray-900">${parseFloat(debt.totalAmount).toFixed(2)}</p>
        </div>
        <div>
          <p className="text-gray-500 text-xs mb-0.5">{CLIENTS.paid}</p>
          <p className="font-medium text-gray-900">${parseFloat(debt.amountPaid).toFixed(2)}</p>
        </div>
        <div>
          <p className="text-gray-500 text-xs mb-0.5">{CLIENTS.remaining}</p>
          <p className={`font-medium ${remainingBalance > 0 ? 'text-gray-900' : 'text-green-700'}`}>
            ${remainingBalance.toFixed(2)}
          </p>
        </div>
      </div>
    </div>
    </Link>
  );
}

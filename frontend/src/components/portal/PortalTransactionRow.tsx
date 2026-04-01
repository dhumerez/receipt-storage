import { Link } from 'react-router';
import type { PortalDebt } from '../../api/portal.ts';
import { PORTAL } from '../../constants/strings/portal.ts';

interface PortalTransactionRowProps {
  debt: PortalDebt;
}

export default function PortalTransactionRow({ debt }: PortalTransactionRowProps) {
  return (
    <Link
      to={`/portal/debts/${debt.id}`}
      className="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0 text-sm hover:bg-gray-50 -mx-4 px-4 transition-colors"
    >
      <div className="flex-1">
        <span className="text-gray-700">{PORTAL.originalLabel} ${parseFloat(debt.totalAmount).toFixed(2)}</span>
      </div>
      <div className="text-right">
        <span className="text-gray-500 mr-4">{PORTAL.paidLabel} ${parseFloat(debt.amountPaid).toFixed(2)}</span>
        <span className={parseFloat(debt.remainingBalance) > 0 ? 'font-medium text-gray-900' : 'font-medium text-green-700'}>
          {PORTAL.remainingLabel} ${parseFloat(debt.remainingBalance).toFixed(2)}
        </span>
      </div>
    </Link>
  );
}

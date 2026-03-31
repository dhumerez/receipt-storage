import type { PortalDebt } from '../../api/portal.ts';

interface PortalTransactionRowProps {
  debt: PortalDebt;
}

export default function PortalTransactionRow({ debt }: PortalTransactionRowProps) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0 text-sm">
      <div className="flex-1">
        <span className="text-gray-700">Original: ${parseFloat(debt.totalAmount).toFixed(2)}</span>
      </div>
      <div className="text-right">
        <span className="text-gray-500 mr-4">Paid: ${parseFloat(debt.amountPaid).toFixed(2)}</span>
        <span className={parseFloat(debt.remainingBalance) > 0 ? 'font-medium text-gray-900' : 'font-medium text-green-700'}>
          Remaining: ${parseFloat(debt.remainingBalance).toFixed(2)}
        </span>
      </div>
    </div>
  );
}

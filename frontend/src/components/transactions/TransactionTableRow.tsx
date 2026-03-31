import { useNavigate } from 'react-router';
import type { TransactionListItem } from '../../api/transactions.ts';
import TransactionStatusBadge from './TransactionStatusBadge.tsx';

interface TransactionTableRowProps {
  transaction: TransactionListItem;
}

export default function TransactionTableRow({ transaction }: TransactionTableRowProps) {
  const navigate = useNavigate();

  const formattedDate = transaction.deliveredAt
    ? new Date(transaction.deliveredAt).toLocaleDateString('en-CA') // YYYY-MM-DD
    : '---';

  return (
    <tr
      role="button"
      tabIndex={0}
      onClick={() => navigate(`/transactions/${transaction.id}`)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          navigate(`/transactions/${transaction.id}`);
        }
      }}
      className="hover:bg-gray-50 cursor-pointer border-t border-gray-200 min-h-[44px]"
    >
      <td className="px-4 py-3 text-sm font-semibold text-gray-900">{transaction.referenceNumber}</td>
      <td className="px-4 py-3 text-sm text-gray-700">{transaction.clientName}</td>
      <td className="px-4 py-3 text-sm text-gray-900 text-right">${transaction.totalAmount}</td>
      <td className="px-4 py-3 text-sm text-gray-700 text-right">${transaction.initialPayment}</td>
      <td className="px-4 py-3">
        <TransactionStatusBadge status={transaction.status} />
      </td>
      <td className="px-4 py-3 text-sm text-gray-500">{formattedDate}</td>
      <td className="px-4 py-3 text-sm text-gray-500">{transaction.submittedBy}</td>
    </tr>
  );
}

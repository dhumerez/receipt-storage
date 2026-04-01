import type { TransactionListItem } from '../../api/transactions.ts';
import TransactionTableRow from './TransactionTableRow.tsx';
import { TRANSACTIONS } from '../../constants/strings/transactions.ts';
import { COMMON } from '../../constants/strings/common.ts';

interface TransactionTableProps {
  transactions: TransactionListItem[];
}

export default function TransactionTable({ transactions }: TransactionTableProps) {
  return (
    <div className="w-full border border-gray-200 rounded-lg overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="bg-gray-50">
            <th className="px-4 py-3 text-left text-xs font-normal text-gray-500 uppercase tracking-wider">{TRANSACTIONS.thRef}</th>
            <th className="px-4 py-3 text-left text-xs font-normal text-gray-500 uppercase tracking-wider">{TRANSACTIONS.thClient}</th>
            <th className="px-4 py-3 text-right text-xs font-normal text-gray-500 uppercase tracking-wider">{COMMON.total}</th>
            <th className="px-4 py-3 text-right text-xs font-normal text-gray-500 uppercase tracking-wider">{TRANSACTIONS.thInitialPayment}</th>
            <th className="px-4 py-3 text-left text-xs font-normal text-gray-500 uppercase tracking-wider">{TRANSACTIONS.thStatus}</th>
            <th className="px-4 py-3 text-left text-xs font-normal text-gray-500 uppercase tracking-wider">{TRANSACTIONS.thDelivered}</th>
            <th className="px-4 py-3 text-left text-xs font-normal text-gray-500 uppercase tracking-wider">{TRANSACTIONS.thSubmittedBy}</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((transaction) => (
            <TransactionTableRow key={transaction.id} transaction={transaction} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

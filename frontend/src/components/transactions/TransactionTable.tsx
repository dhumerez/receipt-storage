import type { TransactionListItem } from '../../api/transactions.ts';
import TransactionTableRow from './TransactionTableRow.tsx';

interface TransactionTableProps {
  transactions: TransactionListItem[];
}

export default function TransactionTable({ transactions }: TransactionTableProps) {
  return (
    <div className="w-full border border-gray-200 rounded-lg overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="bg-gray-50">
            <th className="px-4 py-3 text-left text-xs font-normal text-gray-500 uppercase tracking-wider">Ref #</th>
            <th className="px-4 py-3 text-left text-xs font-normal text-gray-500 uppercase tracking-wider">Client</th>
            <th className="px-4 py-3 text-right text-xs font-normal text-gray-500 uppercase tracking-wider">Total</th>
            <th className="px-4 py-3 text-right text-xs font-normal text-gray-500 uppercase tracking-wider">Initial Payment</th>
            <th className="px-4 py-3 text-left text-xs font-normal text-gray-500 uppercase tracking-wider">Status</th>
            <th className="px-4 py-3 text-left text-xs font-normal text-gray-500 uppercase tracking-wider">Delivered</th>
            <th className="px-4 py-3 text-left text-xs font-normal text-gray-500 uppercase tracking-wider">Submitted By</th>
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

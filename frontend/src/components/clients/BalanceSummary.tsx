import { CLIENTS } from '../../constants/strings/clients.ts';

interface BalanceSummaryProps {
  balance: string; // NUMERIC string e.g. "1250.00"
  asOf: string;    // ISO date string from API
}

export default function BalanceSummary({ balance, asOf }: BalanceSummaryProps) {
  const formattedDate = new Date(asOf).toLocaleDateString();
  const formattedBalance = parseFloat(balance).toFixed(2);

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
      <p className="text-sm text-gray-500 mb-1">
        {CLIENTS.outstandingBalanceAsOf}{' '}
        <time dateTime={asOf} className="font-medium text-gray-700">{formattedDate}</time>
      </p>
      <p className="text-2xl font-semibold text-gray-900">${formattedBalance}</p>
    </div>
  );
}

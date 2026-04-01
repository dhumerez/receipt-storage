import { TRANSACTIONS } from '../../constants/strings/transactions.ts';

type TransactionStatus = 'draft' | 'pending_approval' | 'active' | 'voided' | 'written_off';

interface TransactionStatusBadgeProps {
  status: TransactionStatus;
}

const STATUS_MAP: Record<TransactionStatus, { label: string; className: string }> = {
  pending_approval: { label: TRANSACTIONS.statusPending, className: 'bg-yellow-100 text-yellow-800' },
  active: { label: TRANSACTIONS.statusActive, className: 'bg-green-100 text-green-800' },
  voided: { label: TRANSACTIONS.statusVoided, className: 'bg-gray-100 text-gray-500' },
  draft: { label: TRANSACTIONS.statusDraft, className: 'bg-gray-100 text-gray-600' },
  written_off: { label: TRANSACTIONS.statusWrittenOff, className: 'bg-gray-100 text-gray-500' },
};

export default function TransactionStatusBadge({ status }: TransactionStatusBadgeProps) {
  const { label, className } = STATUS_MAP[status] ?? STATUS_MAP.draft;

  return (
    <span
      aria-label={`Status: ${label}`}
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${className}`}
    >
      {label}
    </span>
  );
}

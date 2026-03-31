type TransactionStatus = 'draft' | 'pending_approval' | 'active' | 'voided' | 'written_off';

interface TransactionStatusBadgeProps {
  status: TransactionStatus;
}

const STATUS_MAP: Record<TransactionStatus, { label: string; className: string }> = {
  pending_approval: { label: 'Pending', className: 'bg-yellow-100 text-yellow-800' },
  active: { label: 'Active', className: 'bg-green-100 text-green-800' },
  voided: { label: 'Voided', className: 'bg-gray-100 text-gray-500' },
  draft: { label: 'Draft', className: 'bg-gray-100 text-gray-600' },
  written_off: { label: 'Written Off', className: 'bg-gray-100 text-gray-500' },
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

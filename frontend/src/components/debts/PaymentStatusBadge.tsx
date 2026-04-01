import { DEBTS } from '../../constants/strings/debts.ts';

type PaymentStatus = 'confirmed' | 'pending_approval' | 'rejected';

const STATUS_LABELS: Record<PaymentStatus, string> = {
  confirmed: DEBTS.paymentConfirmed,
  pending_approval: DEBTS.paymentPendingApproval,
  rejected: DEBTS.paymentRejected,
};

const STATUS_CLASSES: Record<PaymentStatus, string> = {
  confirmed: 'bg-green-100 text-green-800',
  pending_approval: 'bg-yellow-100 text-yellow-800',
  rejected: 'bg-red-100 text-red-700',
};

interface Props {
  status: PaymentStatus;
}

export default function PaymentStatusBadge({ status }: Props) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_CLASSES[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

import { useState } from 'react';
import type { PaymentItem } from '../../api/debts.ts';
import { getPaymentFileUrl } from '../../api/debts.ts';
import PaymentStatusBadge from './PaymentStatusBadge.tsx';

interface PaymentHistoryListProps {
  payments: PaymentItem[];
  debtId: string;
  userRole: string;
  onApprove: (paymentId: string) => void;
  onReject: (paymentId: string, reason: string) => void;
  isApprovingId: string | null;
  isRejectingId: string | null;
}

export default function PaymentHistoryList({
  payments,
  userRole,
  onApprove,
  onReject,
  isApprovingId,
  isRejectingId,
}: PaymentHistoryListProps) {
  const [rejectingPaymentId, setRejectingPaymentId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectError, setRejectError] = useState<string | null>(null);

  const handleRejectSubmit = (paymentId: string) => {
    if (!rejectReason.trim()) {
      setRejectError('A reason is required to reject a payment.');
      return;
    }
    setRejectError(null);
    onReject(paymentId, rejectReason.trim());
    setRejectingPaymentId(null);
    setRejectReason('');
  };

  const cancelReject = () => {
    setRejectingPaymentId(null);
    setRejectReason('');
    setRejectError(null);
  };

  if (payments.length === 0) {
    return (
      <div className="text-center py-8">
        <h3 className="text-sm font-semibold text-gray-900">No payments recorded</h3>
        <p className="text-sm text-gray-500 mt-1">
          Record the first payment to start tracking this debt.
        </p>
      </div>
    );
  }

  // Newest first
  const sorted = [...payments].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  return (
    <div className="space-y-2">
      {sorted.map((payment) => {
        const isMutating = isApprovingId === payment.id || isRejectingId === payment.id;
        const isExpandedReject = rejectingPaymentId === payment.id;

        return (
          <div
            key={payment.id}
            className="bg-white border border-gray-200 rounded-lg p-4"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-900">
                  {new Date(payment.paidAt).toLocaleDateString()}
                </p>
                {(payment.paymentMethod || payment.reference) && (
                  <p className="text-sm text-gray-500">
                    {payment.paymentMethod}
                    {payment.reference && ` \u00B7 Ref ${payment.reference}`}
                  </p>
                )}
                <div className="mt-1">
                  <PaymentStatusBadge status={payment.status} />
                </div>
                {payment.status === 'pending_approval' && (
                  <p className="text-xs text-gray-500 mt-0.5">Does not affect balance</p>
                )}
                {payment.status === 'rejected' && payment.rejectionReason && (
                  <p className="text-xs text-red-600 mt-0.5">
                    Reason: {payment.rejectionReason}
                  </p>
                )}
                <p className="text-xs text-gray-400 mt-1">
                  Recorded by {payment.recordedByName}
                </p>
              </div>
              <div className="text-sm font-semibold text-gray-900">
                ${parseFloat(payment.amount).toFixed(2)}
              </div>
            </div>

            {/* Payment documents */}
            {payment.documents.length > 0 && (
              <div className="flex gap-2 mt-2">
                {payment.documents.map((doc) => {
                  const url = getPaymentFileUrl(doc.filePath);
                  if (doc.mimeType.startsWith('image/')) {
                    return (
                      <a key={doc.id} href={url} target="_blank" rel="noopener noreferrer">
                        <img
                          src={url}
                          alt={doc.originalName}
                          className="w-16 h-16 rounded-md object-cover border border-gray-200"
                        />
                      </a>
                    );
                  }
                  return (
                    <a
                      key={doc.id}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-16 h-16 rounded-md border border-gray-200 bg-gray-50 flex flex-col items-center justify-center p-1"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                        className="w-5 h-5 text-gray-400"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
                        />
                      </svg>
                      <span className="text-[10px] text-gray-500 truncate w-full text-center mt-0.5">
                        {doc.originalName}
                      </span>
                    </a>
                  );
                })}
              </div>
            )}

            {/* Owner approve/reject actions for pending payments */}
            {userRole === 'owner' && payment.status === 'pending_approval' && !isExpandedReject && (
              <div className="flex gap-2 mt-2">
                <button
                  type="button"
                  disabled={isMutating}
                  onClick={() => onApprove(payment.id)}
                  className="bg-blue-600 text-white hover:bg-blue-700 px-3 py-1.5 rounded-md text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isApprovingId === payment.id ? 'Approving...' : 'Approve Payment'}
                </button>
                <button
                  type="button"
                  disabled={isMutating}
                  onClick={() => setRejectingPaymentId(payment.id)}
                  className="border border-gray-300 text-gray-700 hover:bg-gray-50 px-3 py-1.5 rounded-md text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Reject Payment
                </button>
              </div>
            )}

            {/* Inline reject reason form */}
            {isExpandedReject && (
              <div className="mt-2 space-y-2">
                <textarea
                  rows={2}
                  placeholder="Describe why this payment is being rejected"
                  maxLength={500}
                  required
                  value={rejectReason}
                  onChange={(e) => {
                    setRejectReason(e.target.value);
                    if (rejectError) setRejectError(null);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm resize-none"
                />
                {rejectError && (
                  <p className="text-xs text-red-600">{rejectError}</p>
                )}
                <div className="flex items-center">
                  <button
                    type="button"
                    disabled={isRejectingId === payment.id}
                    onClick={() => handleRejectSubmit(payment.id)}
                    className="bg-red-600 text-white hover:bg-red-700 px-3 py-1.5 rounded-md text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isRejectingId === payment.id ? 'Rejecting...' : 'Confirm Reject'}
                  </button>
                  <button
                    type="button"
                    onClick={cancelReject}
                    className="text-xs text-gray-500 hover:text-gray-700 ml-2"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Notes if present */}
            {payment.notes && (
              <p className="text-xs text-gray-500 mt-2 italic">{payment.notes}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}

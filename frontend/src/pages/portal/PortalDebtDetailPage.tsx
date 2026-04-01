import { Link, useParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { getPortalDebt } from '../../api/portal.ts';
import type { PortalPaymentItem } from '../../api/portal.ts';
import { getFileUrl } from '../../api/transactions.ts';
import { PORTAL } from '../../constants/strings/portal.ts';

// Status badge labels and classes — same as DebtCard pattern
const STATUS_LABELS: Record<string, string> = {
  open: PORTAL.statusOpen,
  partially_paid: PORTAL.statusPartiallyPaid,
  fully_paid: PORTAL.statusFullyPaid,
  written_off: PORTAL.statusWrittenOff,
};

const STATUS_CLASSES: Record<string, string> = {
  open: 'bg-green-100 text-green-800',
  partially_paid: 'bg-blue-100 text-blue-700',
  fully_paid: 'bg-green-100 text-green-800',
  written_off: 'bg-gray-100 text-gray-600',
};

function PaymentDocThumbnail({ doc }: { doc: PortalPaymentItem['documents'][number] }) {
  const url = getFileUrl(doc.filePath);

  if (doc.mimeType.startsWith('image/')) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer">
        <img
          src={url}
          alt={doc.originalName}
          className="w-20 h-20 rounded-md object-cover border border-gray-200"
        />
      </a>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="w-20 h-20 rounded-md border border-gray-200 bg-gray-50 flex flex-col items-center justify-center p-1"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
        className="w-6 h-6 text-gray-400"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
        />
      </svg>
      <span className="text-xs text-gray-500 truncate w-full text-center mt-1">
        {doc.originalName}
      </span>
    </a>
  );
}

function PaymentRow({ payment }: { payment: PortalPaymentItem }) {
  const paidDate = new Date(payment.paidAt).toLocaleDateString('en-CA');
  const methodDisplay = [payment.paymentMethod, payment.reference].filter(Boolean).join(' - ');

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 mb-2">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="text-sm text-gray-900">{paidDate}</div>
          {methodDisplay && (
            <div className="text-sm text-gray-500">{methodDisplay}</div>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-gray-900">
            ${parseFloat(payment.amount).toFixed(2)}
          </span>
          {payment.status === 'confirmed' && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
              {PORTAL.confirmed}
            </span>
          )}
          {payment.status === 'pending_approval' && (
            <span className="text-xs text-yellow-700 bg-yellow-50 px-2 py-0.5 rounded">
              {PORTAL.awaitingConfirmationBadge}
            </span>
          )}
          {payment.status === 'rejected' && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
              {PORTAL.rejected}
            </span>
          )}
        </div>
      </div>
      {payment.notes && (
        <div className="mt-2 text-sm text-gray-600">{payment.notes}</div>
      )}
      {payment.documents.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {payment.documents.map((doc) => (
            <PaymentDocThumbnail key={doc.id} doc={doc} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function PortalDebtDetailPage() {
  const { id } = useParams<{ id: string }>();

  const { data: debt, isLoading, error } = useQuery({
    queryKey: ['portalDebt', id],
    queryFn: () => getPortalDebt(id!),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="text-sm text-gray-400">{PORTAL.loadingDebtDetails}</div>
      </div>
    );
  }

  if (error || !debt) {
    return (
      <div className="p-8">
        <Link to="/portal" className="text-sm text-blue-600 hover:text-blue-700">
          {PORTAL.backToDashboard}
        </Link>
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
          {PORTAL.errorLoadingDebt}
        </div>
      </div>
    );
  }

  const remainingZero = parseFloat(debt.remainingBalance) === 0;

  return (
    <div className="p-8">
      <Link to="/portal" className="text-sm text-blue-600 hover:text-blue-700">
        {PORTAL.backToDashboard}
      </Link>

      {/* Section 1: Header */}
      <div className="mt-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold text-gray-900">{PORTAL.debtDetails}</h1>
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_CLASSES[debt.status] ?? 'bg-gray-100 text-gray-600'}`}>
            {STATUS_LABELS[debt.status] ?? debt.status}
          </span>
        </div>

        {debt.status === 'written_off' && debt.writeOffReason && (
          <p className="text-sm text-gray-600 italic mt-1">{debt.writeOffReason}</p>
        )}

        <div className="grid grid-cols-3 gap-4 mt-4">
          <div>
            <div className="text-xs text-gray-500 uppercase tracking-wider">{PORTAL.originalAmount}</div>
            <div className="text-lg font-semibold text-gray-900">
              ${parseFloat(debt.totalAmount).toFixed(2)}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-500 uppercase tracking-wider">{PORTAL.totalPaid}</div>
            <div className="text-lg font-semibold text-gray-900">
              ${parseFloat(debt.amountPaid).toFixed(2)}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-500 uppercase tracking-wider">{PORTAL.remainingBalance}</div>
            <div className={`text-lg font-semibold ${remainingZero ? 'text-green-700' : 'text-gray-900'}`}>
              ${parseFloat(debt.remainingBalance).toFixed(2)}
            </div>
          </div>
        </div>
      </div>

      {/* Section 2: Payment History */}
      <div className="border-t border-gray-200 mt-8 pt-8">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">{PORTAL.paymentHistory}</h2>

        {debt.payments.length > 0 ? (
          <div>
            {debt.payments.map((payment) => (
              <PaymentRow key={payment.id} payment={payment} />
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <h3 className="text-sm font-medium text-gray-900">{PORTAL.noPaymentsYet}</h3>
            <p className="mt-1 text-sm text-gray-500">
              {PORTAL.paymentsWillAppearHere}
            </p>
          </div>
        )}
      </div>

      {/* Section 3: Original Transaction */}
      <div className="border-t border-gray-200 mt-8 pt-8">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">{PORTAL.originalTransaction}</h2>
        <span className="text-sm text-gray-900">{debt.transactionRef}</span>
      </div>
    </div>
  );
}

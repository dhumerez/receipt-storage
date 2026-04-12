import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext.tsx';
import {
  getDebt,
  approvePayment,
  rejectPayment,
  writeOffDebt,
  reopenDebt,
} from '../../api/debts.ts';
import { getFileUrl } from '../../api/transactions.ts';
import AuthenticatedImage, { openAuthenticatedFile } from '../../components/common/AuthenticatedImage.tsx';
import { downloadPdf } from '../../api/reports.ts';
import type { DocumentInfo } from '../../api/debts.ts';
import PaymentForm from '../../components/debts/PaymentForm.tsx';
import PaymentHistoryList from '../../components/debts/PaymentHistoryList.tsx';
import WriteOffDialog from '../../components/debts/WriteOffDialog.tsx';
import { DEBTS } from '../../constants/strings/debts.ts';

const STATUS_LABELS: Record<string, string> = {
  open: DEBTS.statusOpen,
  partially_paid: DEBTS.statusPartiallyPaid,
  fully_paid: DEBTS.statusFullyPaid,
  written_off: DEBTS.statusWrittenOff,
};

const STATUS_CLASSES: Record<string, string> = {
  open: 'bg-green-100 text-green-800',
  partially_paid: 'bg-blue-100 text-blue-700',
  fully_paid: 'bg-green-100 text-green-800',
  written_off: 'bg-gray-100 text-gray-600',
};

function TransactionDocThumbnail({ doc }: { doc: DocumentInfo }) {
  const url = getFileUrl(doc.filePath);

  if (doc.mimeType.startsWith('image/')) {
    return (
      <AuthenticatedImage
        src={url}
        alt={doc.originalName}
        className="w-16 h-16 rounded-md object-cover border border-gray-200"
        lightbox
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => openAuthenticatedFile(url)}
      className="w-16 h-16 rounded-md border border-gray-200 bg-gray-50 flex flex-col items-center justify-center p-1 cursor-pointer hover:bg-gray-100"
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
    </button>
  );
}

export default function DebtDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [pdfLoading, setPdfLoading] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [showWriteOff, setShowWriteOff] = useState(false);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);

  const { data: debt, isLoading, error } = useQuery({
    queryKey: ['debt', id],
    queryFn: () => getDebt(id!),
    enabled: !!id,
  });

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['debt', id] });
    queryClient.invalidateQueries({ queryKey: ['clientDebts'] });
    queryClient.invalidateQueries({ queryKey: ['portalDebts'] });
    queryClient.invalidateQueries({ queryKey: ['portalSummary'] });
  };

  const writeOffMutation = useMutation({
    mutationFn: (reason: string) => writeOffDebt(id!, reason),
    onSuccess: () => {
      invalidateAll();
      setShowWriteOff(false);
    },
  });

  const reopenMutation = useMutation({
    mutationFn: () => reopenDebt(id!),
    onSuccess: () => invalidateAll(),
  });

  const approveMutation = useMutation({
    mutationFn: (paymentId: string) => approvePayment(id!, paymentId),
    onMutate: (paymentId) => setApprovingId(paymentId),
    onSettled: () => setApprovingId(null),
    onSuccess: () => {
      invalidateAll();
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ paymentId, reason }: { paymentId: string; reason: string }) =>
      rejectPayment(id!, paymentId, reason),
    onMutate: ({ paymentId }) => setRejectingId(paymentId),
    onSettled: () => setRejectingId(null),
    onSuccess: () => {
      invalidateAll();
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="text-sm text-gray-400">{DEBTS.loadingDebtDetails}</div>
      </div>
    );
  }

  if (error || !debt) {
    return (
      <div className="p-8">
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
          {DEBTS.errorLoadingDebt}
        </div>
      </div>
    );
  }

  const isOwner = user?.role === 'owner';
  const canRecordPayment = user?.role === 'owner' || user?.role === 'collaborator';
  const isPayable = debt.status === 'open' || debt.status === 'partially_paid';
  const remainingBalance = parseFloat(debt.remainingBalance);

  async function handleDownloadStatement() {
    if (!debt) return;
    setPdfLoading(true);
    try {
      await downloadPdf(
        `/api/v1/reports/receipt/${debt.transactionId}/pdf`,
        `statement-${debt.transactionId.slice(0, 8)}.pdf`,
      );
    } catch {
      // Reset loading state on error
    } finally {
      setPdfLoading(false);
    }
  }

  return (
    <div className="p-8">
      {/* Back link */}
      <Link
        to={`/clients/${debt.clientId}`}
        className="text-sm text-blue-600 hover:text-blue-700"
      >
        {DEBTS.backToClient}
      </Link>

      {/* Section 1 - Header */}
      <div className="mt-4">
        <div className="flex items-center gap-3 flex-wrap">
          <Link
            to={`/clients/${debt.clientId}`}
            className="text-sm text-blue-600 hover:text-blue-700"
          >
            {debt.clientName}
          </Link>
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_CLASSES[debt.status] ?? ''}`}
          >
            {STATUS_LABELS[debt.status] ?? debt.status}
          </span>
          <button
            onClick={handleDownloadStatement}
            disabled={pdfLoading}
            aria-busy={pdfLoading}
            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 text-sm"
          >
            {pdfLoading ? DEBTS.generating : DEBTS.downloadStatement}
          </button>
        </div>

        {debt.status === 'written_off' && debt.writeOffReason && (
          <p className="text-sm text-gray-600 italic mt-1">{debt.writeOffReason}</p>
        )}

        <div className="grid grid-cols-3 gap-4 mt-4">
          <div>
            <p className="text-gray-500 text-xs mb-0.5">{DEBTS.originalAmount}</p>
            <p className="text-sm font-normal text-gray-700">
              ${parseFloat(debt.totalAmount).toFixed(2)}
            </p>
          </div>
          <div>
            <p className="text-gray-500 text-xs mb-0.5">{DEBTS.totalPaid}</p>
            <p className="text-sm font-normal text-gray-700">
              ${parseFloat(debt.amountPaid).toFixed(2)}
            </p>
          </div>
          <div>
            <p className="text-gray-500 text-xs mb-0.5">{DEBTS.remainingBalance}</p>
            <p
              className={`text-2xl font-semibold ${remainingBalance === 0 ? 'text-green-700' : 'text-gray-900'}`}
            >
              ${remainingBalance.toFixed(2)}
            </p>
          </div>
        </div>

        {/* Owner-only actions */}
        {isOwner && (
          <div className="mt-4">
            {isPayable && (
              <button
                type="button"
                onClick={() => setShowWriteOff(true)}
                className="border border-gray-300 text-gray-700 hover:bg-gray-50 px-3 py-2 rounded-md text-sm min-h-[44px]"
              >
                {DEBTS.writeOff}
              </button>
            )}
            {debt.status === 'written_off' && (
              <button
                type="button"
                disabled={reopenMutation.isPending}
                onClick={() => reopenMutation.mutate()}
                className="bg-blue-600 text-white hover:bg-blue-700 px-3 py-2 rounded-md text-sm min-h-[44px] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {reopenMutation.isPending ? DEBTS.processing : DEBTS.reopenDebt}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Section 2 - Payment History */}
      <div className="border-t border-gray-200 mt-8 pt-8">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">{DEBTS.paymentHistory}</h2>
        <PaymentHistoryList
          payments={debt.payments}
          debtId={debt.id}
          userRole={user?.role ?? 'viewer'}
          onApprove={(paymentId) => approveMutation.mutate(paymentId)}
          onReject={(paymentId, reason) => rejectMutation.mutate({ paymentId, reason })}
          isApprovingId={approvingId}
          isRejectingId={rejectingId}
        />
      </div>

      {/* Section 3 - Record Payment */}
      {canRecordPayment && isPayable && (
        <div className="border-t border-gray-200 mt-8 pt-8">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">{DEBTS.recordPayment}</h2>
          {!showPaymentForm ? (
            <button
              type="button"
              onClick={() => setShowPaymentForm(true)}
              className="bg-blue-600 text-white hover:bg-blue-700 px-4 py-2 rounded-md text-sm font-semibold min-h-[44px]"
            >
              {DEBTS.recordPayment}
            </button>
          ) : (
            <PaymentForm
              debtId={debt.id}
              maxAmount={debt.remainingBalance}
              onSuccess={() => {
                setShowPaymentForm(false);
                invalidateAll();
              }}
              onCancel={() => setShowPaymentForm(false)}
            />
          )}
        </div>
      )}

      {/* Section 4 - Original Transaction */}
      <div className="border-t border-gray-200 mt-8 pt-8">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">{DEBTS.originalTransaction}</h2>
        <Link
          to={`/transactions/${debt.transactionId}`}
          className="text-sm text-blue-600 hover:text-blue-700"
        >
          {DEBTS.viewTransaction(debt.transactionRef)}
        </Link>
        {debt.transactionDocuments.length > 0 && (
          <div className="flex gap-2 mt-2">
            {debt.transactionDocuments.map((doc) => (
              <TransactionDocThumbnail key={doc.id} doc={doc} />
            ))}
          </div>
        )}
      </div>

      {/* WriteOff Dialog */}
      <WriteOffDialog
        isOpen={showWriteOff}
        onClose={() => setShowWriteOff(false)}
        onConfirm={(reason) => writeOffMutation.mutate(reason)}
        isSubmitting={writeOffMutation.isPending}
      />
    </div>
  );
}

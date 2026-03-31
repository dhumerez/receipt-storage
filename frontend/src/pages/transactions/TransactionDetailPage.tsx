import { Link, useParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { getTransaction, getFileUrl } from '../../api/transactions.ts';
import type { DocumentInfo } from '../../api/transactions.ts';
import TransactionStatusBadge from '../../components/transactions/TransactionStatusBadge.tsx';
import { useAuth } from '../../contexts/AuthContext.tsx';

function AttachmentThumbnail({ doc }: { doc: DocumentInfo }) {
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

  // PDF or other file type
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

export default function TransactionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();

  const { data, isLoading, error } = useQuery({
    queryKey: ['transaction', id],
    queryFn: () => getTransaction(id!),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="text-sm text-gray-400">Loading transaction...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8">
        <Link to="/transactions" className="text-sm text-blue-600 hover:text-blue-700">
          &larr; Transactions
        </Link>
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
          Could not load this transaction. Please refresh the page.
        </div>
      </div>
    );
  }

  const canSeeInternalNotes = user?.role === 'owner' || user?.role === 'collaborator';

  // Compute amount owed
  const total = parseFloat(data.totalAmount);
  const initial = parseFloat(data.initialPayment);
  const amountOwed = total - initial;

  const formattedDeliveredAt = data.deliveredAt
    ? new Date(data.deliveredAt).toLocaleDateString('en-CA')
    : null;

  const hasClientNotes = data.clientNotes && data.clientNotes.trim().length > 0;
  const hasInternalNotes = data.internalNotes && data.internalNotes.trim().length > 0;
  const hasAnyNotes = hasClientNotes || (canSeeInternalNotes && hasInternalNotes);

  return (
    <div className="p-8">
      <Link to="/transactions" className="text-sm text-blue-600 hover:text-blue-700">
        &larr; Transactions
      </Link>

      {/* Section 1: Header */}
      <div className="mt-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold text-gray-900">{data.referenceNumber}</h1>
          <TransactionStatusBadge status={data.status} />
        </div>
        <Link
          to={`/clients/${data.clientId}`}
          className="text-sm text-blue-600 hover:text-blue-700"
        >
          {data.clientName}
        </Link>
        {formattedDeliveredAt && (
          <p className="text-sm text-gray-500">Delivered: {formattedDeliveredAt}</p>
        )}
        <p className="text-sm text-gray-500">Submitted by: {data.submittedBy}</p>
      </div>

      {/* Section 2: Line Items */}
      <div className="border-t border-gray-200 mt-8 pt-8">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Line Items</h2>
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-4 py-3 text-left text-xs font-normal text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-4 py-3 text-right text-xs font-normal text-gray-500 uppercase tracking-wider">
                  Qty
                </th>
                <th className="px-4 py-3 text-right text-xs font-normal text-gray-500 uppercase tracking-wider">
                  Unit Price
                </th>
                <th className="px-4 py-3 text-right text-xs font-normal text-gray-500 uppercase tracking-wider">
                  Line Total
                </th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((item) => (
                <tr key={item.id} className="border-t border-gray-200">
                  <td className="px-4 py-3 text-sm text-gray-900">{item.description}</td>
                  <td className="px-4 py-3 text-sm text-gray-700 text-right">{item.quantity}</td>
                  <td className="px-4 py-3 text-sm text-gray-700 text-right">${item.unitPrice}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 text-right">${item.lineTotal}</td>
                </tr>
              ))}
              {/* Total row */}
              <tr className="border-t border-gray-200 bg-gray-50">
                <td colSpan={3} className="px-4 py-3 text-sm font-semibold text-gray-900 text-right">
                  Total
                </td>
                <td className="px-4 py-3 text-sm font-semibold text-gray-900 text-right">
                  ${data.totalAmount}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Section 3: Payment Summary */}
      <div className="border-t border-gray-200 mt-8 pt-8">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Payment Summary</h2>
        <div className="space-y-1">
          <p className="text-sm text-gray-700">
            Initial Payment: <span className="font-medium text-gray-900">${data.initialPayment}</span>
          </p>
          {amountOwed > 0 && (
            <p className="text-sm text-gray-700">
              Amount Owed: <span className="font-medium text-red-600">${amountOwed.toFixed(2)}</span>
            </p>
          )}
        </div>
      </div>

      {/* Section 4: Attachments */}
      <div className="border-t border-gray-200 mt-8 pt-8">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Attachments</h2>
        {data.documents.length > 0 ? (
          <div className="flex flex-wrap gap-3">
            {data.documents.map((doc) => (
              <AttachmentThumbnail key={doc.id} doc={doc} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500">No attachments</p>
        )}
      </div>

      {/* Section 5: Notes */}
      <div className="border-t border-gray-200 mt-8 pt-8">
        {hasAnyNotes ? (
          <div className="space-y-4">
            {hasClientNotes && (
              <div>
                <h2 className="text-sm font-semibold text-gray-700 mb-1">Client Notes</h2>
                <p className="text-sm text-gray-700">{data.clientNotes}</p>
              </div>
            )}
            {canSeeInternalNotes && hasInternalNotes && (
              <div>
                <h2 className="text-sm font-semibold text-gray-700 mb-1">Internal Notes</h2>
                <p className="text-sm text-gray-700">{data.internalNotes}</p>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-gray-500">No notes</p>
        )}
      </div>
    </div>
  );
}

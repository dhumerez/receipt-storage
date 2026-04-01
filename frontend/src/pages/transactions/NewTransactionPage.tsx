import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext.tsx';
import { getClients } from '../../api/clients.ts';
import { createTransaction } from '../../api/transactions.ts';
import type { CreateTransactionInput } from '../../api/transactions.ts';
import LineItemBuilder from '../../components/transactions/LineItemBuilder.tsx';
import type { LineItemRow } from '../../components/transactions/LineItemBuilder.tsx';
import CatalogPickerModal from '../../components/transactions/CatalogPickerModal.tsx';
import FileAttachmentSection from '../../components/transactions/FileAttachmentSection.tsx';
import type { ProductListItem } from '../../api/products.ts';
import { TRANSACTIONS } from '../../constants/strings/transactions.ts';
import { COMMON } from '../../constants/strings/common.ts';

const inputClass =
  'w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm';

export default function NewTransactionPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Form state
  const [clientId, setClientId] = useState('');
  const [deliveredAt, setDeliveredAt] = useState('');
  const [description, setDescription] = useState('');
  const [items, setItems] = useState<LineItemRow[]>([]);
  const [initialPayment, setInitialPayment] = useState('0');
  const [clientNotes, setClientNotes] = useState('');
  const [internalNotes, setInternalNotes] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [catalogPickerOpen, setCatalogPickerOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load active clients for selector
  const { data: clients = [] } = useQuery({
    queryKey: ['clients', { status: 'active' }],
    queryFn: () => getClients({ status: 'active' }),
  });

  // Submit mutation
  const mutation = useMutation({
    mutationFn: (data: { input: CreateTransactionInput; files: File[] }) =>
      createTransaction(data.input, data.files),
    onSuccess: () => {
      navigate('/transactions');
    },
    onError: () => {
      setError(TRANSACTIONS.couldntSaveTransaction);
    },
  });

  const isSubmitting = mutation.isPending;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!clientId) {
      setError(TRANSACTIONS.pleaseSelectClient);
      return;
    }
    if (items.length === 0) {
      setError(TRANSACTIONS.pleaseAddLineItem);
      return;
    }

    const input: CreateTransactionInput = {
      clientId,
      initialPayment: parseFloat(initialPayment || '0').toFixed(2),
      items: items.map((item) => ({
        ...(item.productId ? { productId: item.productId } : {}),
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      })),
      ...(description.trim() ? { description: description.trim() } : {}),
      ...(deliveredAt ? { deliveredAt } : {}),
      ...(clientNotes.trim() ? { clientNotes: clientNotes.trim() } : {}),
      ...(internalNotes.trim() ? { internalNotes: internalNotes.trim() } : {}),
    };

    mutation.mutate({ input, files });
  };

  const handleCatalogSelect = (product: ProductListItem) => {
    setItems((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        productId: product.id,
        description: product.name,
        quantity: '1',
        unitPrice: product.unitPrice,
        isCatalog: true,
      },
    ]);
  };

  const canSeeInternalNotes =
    user?.role === 'owner' || user?.role === 'collaborator';

  return (
    <div className="p-8 pb-24">
      <h1 className="text-2xl font-semibold text-gray-900 mb-8">{TRANSACTIONS.newTransaction}</h1>

      {error && (
        <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Client selector */}
        <div>
          <label className="text-sm font-semibold text-gray-700 mb-3 block">{TRANSACTIONS.clientLabel}</label>
          <select
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            className={inputClass}
          >
            <option value="">{TRANSACTIONS.selectClient}</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.fullName}
              </option>
            ))}
          </select>
        </div>

        {/* Delivery date */}
        <div>
          <label className="text-sm font-semibold text-gray-700 mb-3 block">{TRANSACTIONS.deliveryDateLabel}</label>
          <input
            type="date"
            value={deliveredAt}
            onChange={(e) => setDeliveredAt(e.target.value)}
            className={inputClass}
          />
        </div>

        {/* Description */}
        <div>
          <label className="text-sm font-semibold text-gray-700 mb-3 block">{TRANSACTIONS.descriptionLabel}</label>
          <textarea
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={`${inputClass} resize-none`}
            placeholder={TRANSACTIONS.optionalDescription}
          />
        </div>

        {/* Line Items */}
        <div>
          <h2 className="text-sm font-semibold text-gray-700 mb-3">{TRANSACTIONS.lineItemsLabel}</h2>
          <LineItemBuilder
            items={items}
            onChange={setItems}
            onOpenCatalog={() => setCatalogPickerOpen(true)}
          />
        </div>

        {/* Initial Payment */}
        <div>
          <label className="text-sm font-semibold text-gray-700 mb-3 block">{TRANSACTIONS.initialPaymentLabel}</label>
          <input
            type="number"
            min="0"
            step="0.01"
            placeholder="0.00"
            value={initialPayment}
            onChange={(e) => setInitialPayment(e.target.value)}
            className={inputClass}
          />
        </div>

        {/* Client Notes */}
        <div>
          <label className="text-sm font-semibold text-gray-700 mb-3 block">{TRANSACTIONS.clientNotesLabel}</label>
          <textarea
            rows={3}
            value={clientNotes}
            onChange={(e) => setClientNotes(e.target.value)}
            className={`${inputClass} resize-none`}
            placeholder={TRANSACTIONS.clientNotesPlaceholder}
          />
        </div>

        {/* Internal Notes (owner/collaborator only) */}
        {canSeeInternalNotes && (
          <div>
            <label className="text-sm font-semibold text-gray-700 mb-3 block">{TRANSACTIONS.internalNotesLabel}</label>
            <textarea
              rows={3}
              value={internalNotes}
              onChange={(e) => setInternalNotes(e.target.value)}
              className={`${inputClass} resize-none`}
              placeholder={TRANSACTIONS.internalNotesPlaceholder}
            />
          </div>
        )}

        {/* Attachments */}
        <div>
          <h2 className="text-sm font-semibold text-gray-700 mb-3">{TRANSACTIONS.attachmentsLabel}</h2>
          <FileAttachmentSection files={files} onChange={setFiles} />
        </div>
      </form>

      {/* Catalog Picker Modal */}
      <CatalogPickerModal
        isOpen={catalogPickerOpen}
        onClose={() => setCatalogPickerOpen(false)}
        onSelect={handleCatalogSelect}
      />

      {/* Sticky footer */}
      <div className="sticky bottom-0 bg-white border-t border-gray-200 px-8 py-4 flex justify-end gap-3 -mx-8">
        <button
          type="button"
          onClick={() => navigate('/transactions')}
          className="text-sm text-gray-600 hover:text-gray-900"
        >
          {TRANSACTIONS.discardChanges}
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          onClick={handleSubmit}
          className="bg-blue-600 text-white hover:bg-blue-700 px-4 py-2 rounded-md text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? COMMON.saving : TRANSACTIONS.saveTransaction}
        </button>
      </div>
    </div>
  );
}

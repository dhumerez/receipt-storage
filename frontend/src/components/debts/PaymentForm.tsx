import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { createPayment } from '../../api/debts.ts';
import type { CreatePaymentInput } from '../../api/debts.ts';
import FileAttachmentSection from '../transactions/FileAttachmentSection.tsx';

interface PaymentFormProps {
  debtId: string;
  maxAmount: string;
  onSuccess: () => void;
  onCancel: () => void;
}

const PAYMENT_METHODS = ['', 'Cash', 'Transfer', 'Mobile Payment', 'Other'] as const;

export default function PaymentForm({ debtId, maxAmount, onSuccess, onCancel }: PaymentFormProps) {
  const [amount, setAmount] = useState('');
  const [paidAt, setPaidAt] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [customMethod, setCustomMethod] = useState('');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [validationError, setValidationError] = useState<string | null>(null);

  const maxAmountNum = parseFloat(maxAmount);

  const mutation = useMutation({
    mutationFn: (data: { input: CreatePaymentInput; files: File[] }) =>
      createPayment(debtId, data.input, data.files),
    onSuccess: () => {
      onSuccess();
    },
    onError: () => {
      setValidationError("Couldn't save payment. Check your connection and try again.");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setValidationError('Amount is required and must be greater than 0.');
      return;
    }
    if (amountNum > maxAmountNum) {
      setValidationError(`Payment amount exceeds the remaining balance of $${maxAmountNum.toFixed(2)}.`);
      return;
    }
    if (!paidAt) {
      setValidationError('Payment date is required.');
      return;
    }
    if (!paymentMethod) {
      setValidationError('Payment method is required.');
      return;
    }
    if (paymentMethod === 'Other' && !customMethod.trim()) {
      setValidationError('Please enter a payment method.');
      return;
    }

    const methodValue = paymentMethod === 'Other' ? customMethod.trim() : paymentMethod;

    const input: CreatePaymentInput = {
      amount: amountNum.toFixed(2),
      paidAt,
      paymentMethod: methodValue,
      reference: reference.trim() || undefined,
      notes: notes.trim() || undefined,
    };

    mutation.mutate({ input, files });
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        {validationError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
            {validationError}
          </div>
        )}

        <div>
          <label className="block text-sm font-normal text-gray-700 mb-1">Amount *</label>
          <input
            type="number"
            min="0.01"
            step="0.01"
            max={maxAmountNum}
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-normal text-gray-700 mb-1">Payment Date *</label>
          <input
            type="date"
            required
            value={paidAt}
            onChange={(e) => setPaidAt(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-normal text-gray-700 mb-1">Payment Method *</label>
          <select
            required
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
          >
            {PAYMENT_METHODS.map((method) => (
              <option key={method} value={method}>
                {method || 'Select a method'}
              </option>
            ))}
          </select>
          {paymentMethod === 'Other' && (
            <input
              type="text"
              required
              placeholder="Enter payment method"
              value={customMethod}
              onChange={(e) => setCustomMethod(e.target.value)}
              className="w-full mt-2 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
          )}
        </div>

        <div>
          <label className="block text-sm font-normal text-gray-700 mb-1">Reference Number</label>
          <input
            type="text"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-normal text-gray-700 mb-1">Notes</label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm resize-none"
          />
        </div>

        <div>
          <label className="block text-sm font-normal text-gray-700 mb-1">Proof Documents</label>
          <FileAttachmentSection files={files} onChange={setFiles} />
        </div>

        <div className="flex justify-end gap-3 mt-4">
          <button
            type="button"
            onClick={onCancel}
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={mutation.isPending}
            className="bg-blue-600 text-white hover:bg-blue-700 px-4 py-2 rounded-md text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {mutation.isPending ? 'Saving...' : 'Save Payment'}
          </button>
        </div>
      </form>
    </div>
  );
}

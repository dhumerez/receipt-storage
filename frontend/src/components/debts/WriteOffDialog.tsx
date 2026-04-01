import { useState, useEffect } from 'react';

interface WriteOffDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  isSubmitting: boolean;
}

export default function WriteOffDialog({ isOpen, onClose, onConfirm, isSubmitting }: WriteOffDialogProps) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (isOpen) {
      setReason('');
      setError(null);
    }
  }, [isOpen]);

  // Close on Escape only if textarea is empty
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !reason.trim()) {
        onClose();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose, reason]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError('A reason is required to write off this debt.');
      return;
    }
    setError(null);
    onConfirm(reason.trim());
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
        <h2 className="text-xl font-semibold text-gray-900">Write Off Debt</h2>
        <p className="text-sm text-gray-500 mt-1 mb-4">
          This will mark the debt as uncollectible. You can reopen it later if needed.
        </p>

        <form onSubmit={handleSubmit}>
          <textarea
            rows={3}
            placeholder="Describe why this debt is being written off"
            maxLength={500}
            required
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              if (error) setError(null);
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm resize-none"
          />
          {error && (
            <p className="text-xs text-red-600 mt-1">{error}</p>
          )}

          <div className="flex justify-end gap-3 mt-4">
            <button
              type="button"
              onClick={onClose}
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-red-600 text-white hover:bg-red-700 px-4 py-2 rounded-md text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Processing...' : 'Write Off Debt'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { deactivateClient } from '../../api/clients.ts';

interface DeactivateConfirmModalProps {
  isOpen: boolean;
  clientId: string;
  clientName: string;
  onClose: () => void;
  redirectAfter?: boolean; // true when called from detail page
}

export default function DeactivateConfirmModal({ isOpen, clientId, clientName: _clientName, onClose, redirectAfter }: DeactivateConfirmModalProps) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const mutation = useMutation({
    mutationFn: () => deactivateClient(clientId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['client', clientId] });
      onClose();
      if (redirectAfter) navigate('/clients', { replace: true });
    },
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-3">Deactivate client?</h2>
        <p className="text-sm text-gray-600 mb-6">
          This client will be hidden from active lists. Existing debts and payment history are preserved. You can reactivate them at any time.
        </p>
        <div className="flex justify-end gap-3">
          <button type="button" onClick={onClose}
            className="px-4 py-2 text-sm border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">
            Keep Client
          </button>
          <button type="button" onClick={() => mutation.mutate()} disabled={mutation.isPending}
            className="px-4 py-2 text-sm border border-red-300 rounded-md text-red-700 hover:bg-red-50 disabled:opacity-50">
            {mutation.isPending ? 'Deactivating...' : 'Deactivate Client'}
          </button>
        </div>
      </div>
    </div>
  );
}

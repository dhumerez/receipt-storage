import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { deactivateClient } from '../../api/clients.ts';
import { CLIENTS } from '../../constants/strings/clients.ts';

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
        <h2 className="text-xl font-semibold text-gray-900 mb-3">{CLIENTS.deactivateClientQuestion}</h2>
        <p className="text-sm text-gray-600 mb-6">
          {CLIENTS.deactivateClientBody}
        </p>
        <div className="flex justify-end gap-3">
          <button type="button" onClick={onClose}
            className="px-4 py-2 text-sm border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">
            {CLIENTS.keepClient}
          </button>
          <button type="button" onClick={() => mutation.mutate()} disabled={mutation.isPending}
            className="px-4 py-2 text-sm border border-red-300 rounded-md text-red-700 hover:bg-red-50 disabled:opacity-50">
            {mutation.isPending ? CLIENTS.deactivating : CLIENTS.deactivateClient}
          </button>
        </div>
      </div>
    </div>
  );
}

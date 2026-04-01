import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import type { Client } from '../../api/clients.ts';
import { sendPortalInvite } from '../../api/clients.ts';
import { CLIENTS } from '../../constants/strings/clients.ts';
import { COMMON } from '../../constants/strings/common.ts';
import ClientStatusBadge from './ClientStatusBadge.tsx';
import ClientModal from './ClientModal.tsx';
import DeactivateConfirmModal from './DeactivateConfirmModal.tsx';

interface ClientDetailHeaderProps {
  client: Client;
}

export default function ClientDetailHeader({ client }: ClientDetailHeaderProps) {
  const [editOpen, setEditOpen] = useState(false);
  const [deactivateOpen, setDeactivateOpen] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState(false);
  const [inviteError, setInviteError] = useState('');

  const inviteMutation = useMutation({
    mutationFn: () => sendPortalInvite(client.id),
    onSuccess: () => {
      setInviteSuccess(true);
      setInviteError('');
    },
    onError: () =>
      setInviteError(CLIENTS.inviteCouldNotBeSent),
  });

  const hasEmail = !!client.email;
  const portalActive = !!client.userId;

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-semibold text-gray-900">{client.fullName}</h1>
            <ClientStatusBadge isActive={client.isActive} />
          </div>
          <div className="space-y-1 text-sm text-gray-600">
            {client.email && <p>{client.email}</p>}
            {client.phone && <p>{client.phone}</p>}
            {client.address && <p>{client.address}</p>}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setEditOpen(true)}
            className="px-4 py-2 text-sm border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            {CLIENTS.editClient}
          </button>
          {client.isActive && (
            <button
              type="button"
              onClick={() => hasEmail && !portalActive && inviteMutation.mutate()}
              disabled={!hasEmail || portalActive || inviteMutation.isPending}
              title={
                !hasEmail
                  ? CLIENTS.addEmailBeforeInvite
                  : portalActive
                  ? CLIENTS.portalAccessAlreadyActive
                  : undefined
              }
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {inviteMutation.isPending
                ? COMMON.processing
                : portalActive
                ? CLIENTS.portalActive
                : CLIENTS.sendPortalInvite}
            </button>
          )}
          {client.isActive && (
            <button
              type="button"
              onClick={() => setDeactivateOpen(true)}
              className="px-4 py-2 text-sm border border-red-300 rounded-md text-red-700 hover:bg-red-50"
            >
              {CLIENTS.deactivateClient}
            </button>
          )}
        </div>
      </div>

      {inviteSuccess && (
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded text-green-800 text-sm">
          {CLIENTS.inviteSentTo(client.email!)}
        </div>
      )}
      {inviteError && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
          {inviteError}
        </div>
      )}

      <ClientModal isOpen={editOpen} onClose={() => setEditOpen(false)} editData={client} />
      <DeactivateConfirmModal
        isOpen={deactivateOpen}
        clientId={client.id}
        clientName={client.fullName}
        onClose={() => setDeactivateOpen(false)}
        redirectAfter
      />
    </div>
  );
}

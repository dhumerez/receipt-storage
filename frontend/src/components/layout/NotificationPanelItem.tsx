import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { approveTransaction, rejectTransaction } from '../../api/notifications.ts';
import type { NotificationItem } from '../../api/notifications.ts';

interface NotificationPanelItemProps {
  notification: NotificationItem;
  userRole: string;
}

function StatusBadge({ action, rejectionReason }: { action: string; rejectionReason?: string }) {
  if (action === 'approved') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800">
        Approved
      </span>
    );
  }
  if (action === 'rejected') {
    return (
      <div>
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800">
          Rejected
        </span>
        {rejectionReason && (
          <p className="text-xs text-gray-500 mt-1">{rejectionReason}</p>
        )}
      </div>
    );
  }
  // submitted_for_approval or default
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800">
      Pending
    </span>
  );
}

export default function NotificationPanelItem({ notification, userRole }: NotificationPanelItemProps) {
  const queryClient = useQueryClient();
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [reasonError, setReasonError] = useState('');
  const [actionError, setActionError] = useState('');

  const approveMutation = useMutation({
    mutationFn: () => approveTransaction(notification.entityId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
      setActionError('');
    },
    onError: () => {
      setActionError("Couldn't process that action. Please try again.");
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (reason: string) => rejectTransaction(notification.entityId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
      setShowRejectForm(false);
      setRejectReason('');
      setReasonError('');
      setActionError('');
    },
    onError: () => {
      setActionError("Couldn't process that action. Please try again.");
    },
  });

  const handleConfirmReject = () => {
    if (!rejectReason.trim()) {
      setReasonError('A reason is required to reject a transaction.');
      return;
    }
    setReasonError('');
    rejectMutation.mutate(rejectReason.trim());
  };

  const handleCancelReject = () => {
    setShowRejectForm(false);
    setRejectReason('');
    setReasonError('');
  };

  const isOwner = userRole === 'owner';

  return (
    <div className="min-h-[44px] p-3 border-b border-gray-100">
      {/* Notification details */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-normal text-gray-500">{notification.referenceNumber}</p>
          <p className="text-sm font-medium text-gray-900 truncate">{notification.clientName}</p>
          <p className="text-sm text-gray-700">${notification.totalAmount}</p>
          <p className="text-xs text-gray-500">by {notification.submitterName}</p>
        </div>

        {/* Collaborator: show status badge */}
        {!isOwner && (
          <div className="flex-shrink-0">
            <StatusBadge action={notification.action} rejectionReason={notification.rejectionReason} />
          </div>
        )}
      </div>

      {/* Owner actions */}
      {isOwner && !showRejectForm && (
        <div className="flex items-center gap-2 mt-2">
          <button
            type="button"
            className="bg-blue-600 text-white hover:bg-blue-700 px-3 py-1 rounded text-sm disabled:opacity-50"
            onClick={() => approveMutation.mutate()}
            disabled={approveMutation.isPending || rejectMutation.isPending}
          >
            {approveMutation.isPending ? 'Approving...' : 'Approve'}
          </button>
          <button
            type="button"
            className="border border-gray-300 text-gray-700 hover:bg-gray-50 px-3 py-1 rounded text-sm"
            onClick={() => setShowRejectForm(true)}
            disabled={approveMutation.isPending || rejectMutation.isPending}
          >
            Reject
          </button>
        </div>
      )}

      {/* Reject inline expansion */}
      {isOwner && showRejectForm && (
        <div className="mt-2 space-y-2">
          <textarea
            rows={2}
            placeholder="Describe why this transaction is being rejected"
            maxLength={500}
            className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            value={rejectReason}
            onChange={(e) => {
              setRejectReason(e.target.value);
              if (reasonError) setReasonError('');
            }}
          />
          {reasonError && (
            <p className="text-xs text-red-600">{reasonError}</p>
          )}
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="bg-red-600 text-white hover:bg-red-700 px-3 py-1 rounded text-sm disabled:opacity-50"
              onClick={handleConfirmReject}
              disabled={rejectMutation.isPending}
            >
              {rejectMutation.isPending ? 'Rejecting...' : 'Confirm Reject'}
            </button>
            <button
              type="button"
              className="text-sm text-gray-500 hover:text-gray-700"
              onClick={handleCancelReject}
              disabled={rejectMutation.isPending}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Action error */}
      {actionError && (
        <p className="text-xs text-red-600 mt-1">{actionError}</p>
      )}
    </div>
  );
}

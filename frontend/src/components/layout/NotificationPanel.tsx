import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext.tsx';
import { getNotifications, markAllNotificationsRead } from '../../api/notifications.ts';
import NotificationPanelItem from './NotificationPanelItem.tsx';
import { COMMON } from '../../constants/strings/common.ts';

interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function NotificationPanel({ isOpen, onClose }: NotificationPanelProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications'],
    queryFn: getNotifications,
    enabled: isOpen,
  });

  const markAllRead = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
    },
  });

  const userRole = user?.role ?? 'viewer';
  const isOwner = userRole === 'owner';

  // Filter notifications based on role
  const filteredNotifications = isOwner
    ? notifications.filter((n) => n.action === 'submitted_for_approval')
    : notifications;

  return (
    <>
      {/* Overlay to capture outside clicks */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-transparent z-50"
          onClick={onClose}
        />
      )}

      {/* Slide-out panel */}
      <div
        className={`fixed inset-y-0 right-0 w-full sm:w-96 bg-white shadow-xl z-50 flex flex-col transform transition-transform duration-200 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">{COMMON.notifications}</h2>
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="text-sm text-blue-600 hover:text-blue-700"
              onClick={() => markAllRead.mutate()}
            >
              {COMMON.markAllRead}
            </button>
            <button
              type="button"
              className="p-1 text-gray-400 hover:text-gray-600 rounded"
              aria-label="Close notifications"
              onClick={onClose}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-5 h-5"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto flex-1">
          {filteredNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-6 py-12">
              {isOwner ? (
                <>
                  <p className="text-base font-medium text-gray-900">{COMMON.allCaughtUp}</p>
                  <p className="text-sm text-gray-500 mt-1">
                    {COMMON.noTransactionsWaiting}
                  </p>
                </>
              ) : (
                <>
                  <p className="text-base font-medium text-gray-900">{COMMON.noSubmissionsYet}</p>
                  <p className="text-sm text-gray-500 mt-1">
                    {COMMON.submittedTransactionsWillAppear}
                  </p>
                </>
              )}
            </div>
          ) : (
            filteredNotifications.map((notification) => (
              <NotificationPanelItem
                key={notification.id}
                notification={notification}
                userRole={userRole}
              />
            ))
          )}
        </div>
      </div>
    </>
  );
}

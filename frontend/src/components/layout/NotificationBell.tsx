import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext.tsx';
import { getUnreadCount } from '../../api/notifications.ts';
import NotificationPanel from './NotificationPanel.tsx';

export default function NotificationBell() {
  const { user } = useAuth();
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  const canView = !!user && (user.role === 'owner' || user.role === 'collaborator');

  const { data } = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: getUnreadCount,
    staleTime: 30_000,
    refetchInterval: 60_000,
    enabled: canView,
  });

  if (!canView) return null;

  const count = data?.count ?? 0;

  return (
    <>
      <button
        type="button"
        className="relative p-2 text-gray-500 hover:text-gray-700 rounded-md"
        aria-label="Notifications"
        onClick={() => setIsPanelOpen((prev) => !prev)}
      >
        {/* Heroicons outline bell 24x24 */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className="w-6 h-6"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0"
          />
        </svg>
        {count > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-blue-600 text-white text-xs flex items-center justify-center">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>
      <NotificationPanel
        isOpen={isPanelOpen}
        onClose={() => setIsPanelOpen(false)}
      />
    </>
  );
}

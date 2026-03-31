import { Outlet } from 'react-router';
import Sidebar from './Sidebar.tsx';
import BottomTabBar from './BottomTabBar.tsx';
import NotificationBell from './NotificationBell.tsx';

// D-03: AppLayout now includes sidebar (desktop) and bottom tab bar (mobile)
// Structure from UI-SPEC: Sidebar (240px) | main (flex-1, overflow-auto)
// Mobile: pb-16 on main to clear fixed BottomTabBar

export default function AppLayout() {
  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top header bar */}
        <header className="bg-white border-b border-gray-200 px-4 py-2 flex items-center justify-end">
          <NotificationBell />
        </header>
        {/* Main content */}
        <main className="flex-1 overflow-auto pb-16 md:pb-0">
          <Outlet />
        </main>
      </div>
      <BottomTabBar />
    </div>
  );
}

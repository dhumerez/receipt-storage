import { Outlet } from 'react-router';
import Sidebar from './Sidebar.tsx';
import BottomTabBar from './BottomTabBar.tsx';

// D-03: AppLayout now includes sidebar (desktop) and bottom tab bar (mobile)
// Structure from UI-SPEC: Sidebar (240px) | main (flex-1, overflow-auto)
// Mobile: pb-16 on main to clear fixed BottomTabBar

export default function AppLayout() {
  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar />
      <main className="flex-1 overflow-auto pb-16 md:pb-0">
        <Outlet />
      </main>
      <BottomTabBar />
    </div>
  );
}

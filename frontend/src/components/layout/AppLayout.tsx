import { Outlet, useNavigate } from 'react-router';
import Sidebar from './Sidebar.tsx';
import BottomTabBar from './BottomTabBar.tsx';
import NotificationBell from './NotificationBell.tsx';
import { PwaInstallBanner } from '../PwaInstallBanner.tsx';
import { useAuth } from '../../contexts/AuthContext.tsx';
import { COMMON } from '../../constants/strings/common.ts';

export default function AppLayout() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top header bar */}
        <header className="bg-white border-b border-gray-200 px-4 py-2 flex items-center justify-end gap-2">
          <NotificationBell />
          <button
            onClick={handleLogout}
            className="text-sm text-gray-500 hover:text-gray-800 px-3 py-1 rounded border border-gray-300 hover:border-gray-400"
          >
            {COMMON.logout}
          </button>
        </header>
        {/* Main content */}
        <main className="flex-1 overflow-auto pb-16 md:pb-0">
          <Outlet />
        </main>
      </div>
      {/* PWA install guidance — Android shows native prompt; iOS shows manual instruction */}
      <PwaInstallBanner />
      <BottomTabBar />
    </div>
  );
}

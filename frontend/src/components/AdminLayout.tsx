import { Outlet, useNavigate } from 'react-router';
import { useAuth } from '../contexts/AuthContext.tsx';
import { ADMIN } from '../constants/strings/admin.ts';
import { COMMON } from '../constants/strings/common.ts';

export default function AdminLayout() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <span className="text-base font-semibold text-gray-900">{ADMIN.adminPanel}</span>
        <button
          onClick={handleLogout}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          {COMMON.logout}
        </button>
      </header>
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}

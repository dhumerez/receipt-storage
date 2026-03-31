import { useNavigate, Outlet } from 'react-router';
import { useAuth } from '../../contexts/AuthContext.tsx';

export default function PortalLayout() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <span className="text-base font-semibold text-gray-900">Receipts Tracker</span>
        <button
          onClick={handleLogout}
          className="text-sm text-gray-500 hover:text-gray-800 px-3 py-1 rounded border border-gray-300 hover:border-gray-400"
        >
          Logout
        </button>
      </header>
      <main className="max-w-2xl mx-auto px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}

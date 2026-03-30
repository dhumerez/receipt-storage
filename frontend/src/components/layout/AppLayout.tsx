import { Outlet, useNavigate } from 'react-router';
import { useAuth } from '../../contexts/AuthContext.tsx';

export default function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-gray-900">Receipts Tracker</h1>
        {user && (
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">{user.sub}</span>
            <button
              onClick={handleLogout}
              className="text-sm text-gray-500 hover:text-gray-800 px-3 py-1 rounded border border-gray-300 hover:border-gray-400"
            >
              Logout
            </button>
          </div>
        )}
      </header>
      <main className="container mx-auto px-6 py-8">
        <Outlet />
      </main>
    </div>
  );
}

import { Navigate, Outlet } from 'react-router';
import { useAuth } from '../contexts/AuthContext.tsx';

// D-11: Guards routes that require role='client'
// Non-client authenticated users are redirected to /
// Unauthenticated users are redirected to /login

export default function ClientRoute() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-400 text-sm">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role !== 'client') {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}

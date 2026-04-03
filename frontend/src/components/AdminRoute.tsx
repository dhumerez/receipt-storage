import { Navigate, Outlet } from 'react-router';
import { useAuth } from '../contexts/AuthContext.tsx';
import { ADMIN } from '../constants/strings/admin.ts';

export default function AdminRoute() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-600 text-base font-medium animate-pulse">{ADMIN.loading}</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!user.isSuperAdmin) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}

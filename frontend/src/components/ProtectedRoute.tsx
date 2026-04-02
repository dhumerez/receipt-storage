import { Navigate, Outlet } from 'react-router';
import { useAuth } from '../contexts/AuthContext.tsx';

interface ProtectedRouteProps {
  redirectTo?: string;
}

/**
 * Renders <Outlet /> for authenticated users.
 * Shows loading spinner while session recovery is in progress.
 * Redirects to /login when unauthenticated.
 */
export default function ProtectedRoute({ redirectTo = '/login' }: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-600 text-base font-medium animate-pulse">Cargando...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to={redirectTo} replace />;
  }

  return <Outlet />;
}

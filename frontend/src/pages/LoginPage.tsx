import { Navigate, useNavigate } from 'react-router';
import { AuthPage } from '../components/auth/AuthPage';
import { useAuth } from '../contexts/AuthContext.tsx';

const DEMO_CREDENTIALS = [
  { label: 'Super Admin', email: 'admin@demo.com', password: 'Admin1234!' },
  { label: 'Propietario', email: 'owner@demo.com', password: 'Owner1234!' },
];

export default function LoginPage() {
  const { login, user, isLoading } = useAuth();
  const navigate = useNavigate();

  if (!isLoading && user) {
    if (user.isSuperAdmin) return <Navigate to="/admin" replace />;
    return <Navigate to={user.role === 'client' ? '/portal' : '/'} replace />;
  }

  const handleLogin = async (email: string, password: string) => {
    const loggedInUser = await login(email, password);
    if (loggedInUser.isSuperAdmin) {
      navigate('/admin', { replace: true });
    } else if (loggedInUser.role === 'client') {
      navigate('/portal', { replace: true });
    } else {
      navigate('/', { replace: true });
    }
  };

  return (
    <AuthPage
      appName="Receipts"
      tagline="Gestión de facturas y gastos"
      registrationMode="disabled"
      onLogin={handleLogin}
      variant="light"
      demoCredentials={DEMO_CREDENTIALS}
      forgotPasswordHref="/forgot-password"
    />
  );
}

import { Routes, Route } from 'react-router';          // react-router, NOT react-router-dom
import ProtectedRoute from './components/ProtectedRoute.tsx';
import AppLayout from './components/layout/AppLayout.tsx';
import LoginPage from './pages/LoginPage.tsx';
import DashboardPage from './pages/DashboardPage.tsx';
import AcceptInvitePage from './pages/AcceptInvitePage.tsx';
import ResetPasswordPage from './pages/ResetPasswordPage.tsx';
import ForgotPasswordPage from './pages/ForgotPasswordPage.tsx';

export default function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/accept-invite" element={<AcceptInvitePage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      {/* Protected routes — redirect to /login when unauthenticated */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<DashboardPage />} />
          {/* Additional protected routes added in Phases 3+ */}
        </Route>
      </Route>
    </Routes>
  );
}

import { Routes, Route, useLocation } from 'react-router';
import { useEffect } from 'react';
import ProtectedRoute from './components/ProtectedRoute.tsx';
import ClientRoute from './components/ClientRoute.tsx';
import AppLayout from './components/layout/AppLayout.tsx';
import PortalLayout from './components/layout/PortalLayout.tsx';
import LoginPage from './pages/LoginPage.tsx';
import DashboardPage from './pages/DashboardPage.tsx';
import AcceptInvitePage from './pages/AcceptInvitePage.tsx';
import ResetPasswordPage from './pages/ResetPasswordPage.tsx';
import ForgotPasswordPage from './pages/ForgotPasswordPage.tsx';
import ClientsPage from './pages/clients/ClientsPage.tsx';
import ClientDetailPage from './pages/clients/ClientDetailPage.tsx';
import PortalPage from './pages/portal/PortalPage.tsx';
import PortalDebtDetailPage from './pages/portal/PortalDebtDetailPage.tsx';
import ProductsPage from './pages/products/ProductsPage.tsx';
import TransactionsPage from './pages/transactions/TransactionsPage.tsx';
import NewTransactionPage from './pages/transactions/NewTransactionPage.tsx';
import TransactionDetailPage from './pages/transactions/TransactionDetailPage.tsx';
import DebtDetailPage from './pages/debts/DebtDetailPage.tsx';
import ReportsPage from './pages/reports/ReportsPage.tsx';
import SettingsPage from './pages/settings/SettingsPage.tsx';

function LocationLogger() {
  const location = useLocation();
  const dlog = (window as unknown as { _dlog: (msg: string) => void })._dlog;
  useEffect(() => {
    if (dlog) dlog('RR location: pathname="' + location.pathname + '" search="' + location.search + '" hash="' + location.hash + '"');
  }, [location, dlog]);
  return null;
}

function NoMatch() {
  const location = useLocation();
  const dlog = (window as unknown as { _dlog: (msg: string) => void })._dlog;
  if (dlog) dlog('NO_ROUTE_MATCH: pathname="' + location.pathname + '" search="' + location.search + '"');
  return (
    <div style={{ padding: '2rem', fontFamily: 'monospace', color: 'red' }}>
      <h2>404 — No route matched</h2>
      <p>location.pathname: {location.pathname}</p>
      <p>window.location.pathname: {window.location.pathname}</p>
      <p>window.location.href: {window.location.href}</p>
    </div>
  );
}

export default function App() {
  return (
    <>
    <LocationLogger />
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/accept-invite" element={<AcceptInvitePage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      {/* Owner/collaborator/viewer routes — redirect clients to /portal */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/clients" element={<ClientsPage />} />
          <Route path="/clients/:id" element={<ClientDetailPage />} />
          <Route path="/products" element={<ProductsPage />} />
          <Route path="/transactions" element={<TransactionsPage />} />
          <Route path="/transactions/new" element={<NewTransactionPage />} />
          <Route path="/transactions/:id" element={<TransactionDetailPage />} />
          <Route path="/debts/:id" element={<DebtDetailPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Route>

      {/* Client portal routes — redirect non-clients to / */}
      <Route element={<ClientRoute />}>
        <Route element={<PortalLayout />}>
          <Route path="/portal" element={<PortalPage />} />
          <Route path="/portal/debts/:id" element={<PortalDebtDetailPage />} />
        </Route>
      </Route>

      {/* Catch-all for debugging route mismatches */}
      <Route path="*" element={<NoMatch />} />
    </Routes>
    </>
  );
}

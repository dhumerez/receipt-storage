import { Component, type ReactNode } from 'react';
import { Routes, Route } from 'react-router';          // react-router, NOT react-router-dom
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

// Debug: validate page/component imports
const pageImports: Record<string, unknown> = {
  ProtectedRoute, ClientRoute, AppLayout, PortalLayout,
  LoginPage, DashboardPage, AcceptInvitePage, ResetPasswordPage, ForgotPasswordPage,
  ClientsPage, ClientDetailPage, PortalPage, PortalDebtDetailPage,
  ProductsPage, TransactionsPage, NewTransactionPage, TransactionDetailPage,
  DebtDetailPage, ReportsPage, SettingsPage, Routes, Route,
};
const badPages = Object.entries(pageImports).filter(([, v]) => v == null);
if (badPages.length > 0) {
  const msg = 'Undefined page imports: ' + badPages.map(([k]) => k).join(', ');
  document.getElementById('root')!.innerHTML = `<pre style="padding:1rem;color:red">${msg}</pre>`;
  throw new Error(msg);
}

// Error boundary to catch render errors with detail
class ErrorBoundary extends Component<{children: ReactNode}, {error: Error | null}> {
  state: {error: Error | null} = { error: null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  render() {
    if (this.state.error) {
      return <pre style={{padding:'1rem',color:'red',fontSize:'12px',whiteSpace:'pre-wrap'}}>
        Render error: {this.state.error.message}{'\n'}{this.state.error.stack}
      </pre>;
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <ErrorBoundary><Routes>
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
    </Routes></ErrorBoundary>
  );
}

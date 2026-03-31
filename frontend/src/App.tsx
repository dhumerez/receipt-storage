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
import ProductsPage from './pages/products/ProductsPage.tsx';
import TransactionsPage from './pages/transactions/TransactionsPage.tsx';
import NewTransactionPage from './pages/transactions/NewTransactionPage.tsx';
import TransactionDetailPage from './pages/transactions/TransactionDetailPage.tsx';

export default function App() {
  return (
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
        </Route>
      </Route>

      {/* Client portal routes — redirect non-clients to / */}
      <Route element={<ClientRoute />}>
        <Route element={<PortalLayout />}>
          <Route path="/portal" element={<PortalPage />} />
        </Route>
      </Route>
    </Routes>
  );
}

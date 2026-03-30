import { Routes, Route } from 'react-router';          // react-router, NOT react-router-dom
import AppLayout from './components/layout/AppLayout.tsx';
import LoginPage from './pages/LoginPage.tsx';
import DashboardPage from './pages/DashboardPage.tsx';

export default function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<LoginPage />} />

      {/* Protected routes (auth guard added in Phase 2) */}
      <Route element={<AppLayout />}>
        <Route path="/" element={<DashboardPage />} />
      </Route>
    </Routes>
  );
}

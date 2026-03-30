import { Outlet } from 'react-router';                 // react-router, NOT react-router-dom

/**
 * Base layout shell.
 * Phase 2 adds: navigation bar with user menu and notification badge.
 * Phase 3+ adds: sidebar navigation.
 * For now: renders a full-width container with the child route outlet.
 */
export default function AppLayout() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation added in Phase 2 */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <h1 className="text-lg font-semibold text-gray-900">Receipts Tracker</h1>
      </header>
      <main className="container mx-auto px-6 py-8">
        <Outlet />
      </main>
    </div>
  );
}

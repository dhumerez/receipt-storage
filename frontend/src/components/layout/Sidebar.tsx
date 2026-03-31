import { NavLink } from 'react-router';

const NAV_ITEMS = [
  { to: '/clients', label: 'Clients' },
  { to: '/products', label: 'Products' },
  { to: '/transactions', label: 'Transactions' },
  { to: '/reports', label: 'Reports' },
];

export default function Sidebar() {
  return (
    <nav
      aria-label="Main navigation"
      className="hidden md:flex flex-col w-60 min-h-screen bg-white border-r border-gray-200 flex-shrink-0"
    >
      <div className="px-6 py-5 border-b border-gray-200">
        <span className="text-base font-semibold text-gray-900">Receipts Tracker</span>
      </div>
      <ul className="flex-1 py-2">
        {NAV_ITEMS.map(({ to, label }) => (
          <li key={to}>
            <NavLink
              to={to}
              className={({ isActive }) =>
                isActive
                  ? 'flex items-center gap-3 px-4 py-2 min-h-[44px] border-l-4 border-blue-600 bg-blue-50 text-blue-600 font-medium text-sm'
                  : 'flex items-center gap-3 px-4 py-2 min-h-[44px] border-l-4 border-transparent text-gray-600 hover:bg-gray-100 hover:text-gray-900 text-sm'
              }
            >
              {label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}

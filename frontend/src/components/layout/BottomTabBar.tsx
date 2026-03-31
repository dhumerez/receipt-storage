import { NavLink } from 'react-router';

const TABS = [
  { to: '/clients', label: 'Clients' },
  { to: '/products', label: 'Products' },
  { to: '/transactions', label: 'Transactions' },
  { to: '/reports', label: 'Reports' },
];

export default function BottomTabBar() {
  return (
    <nav
      aria-label="Mobile navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 h-14 bg-white border-t border-gray-200 flex z-40"
    >
      {TABS.map(({ to, label }) => (
        <NavLink
          key={to}
          to={to}
          aria-label={label}
          className={({ isActive }) =>
            `flex flex-1 flex-col items-center justify-center text-xs min-h-[56px] ${
              isActive ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700'
            }`
          }
        >
          <span className="text-xs mt-1">{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}

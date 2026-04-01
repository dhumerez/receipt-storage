interface ReportTabSwitcherProps {
  activeTab: 'company' | 'client';
  onTabChange: (tab: 'company' | 'client') => void;
}

const TABS: { key: 'company' | 'client'; label: string }[] = [
  { key: 'company', label: 'Company Report' },
  { key: 'client', label: 'Client Report' },
];

export default function ReportTabSwitcher({
  activeTab,
  onTabChange,
}: ReportTabSwitcherProps) {
  return (
    <div role="tablist" className="flex border-b border-gray-200">
      {TABS.map((tab) => {
        const isActive = activeTab === tab.key;
        return (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onTabChange(tab.key)}
            className={`px-4 py-2 text-sm transition-colors ${
              isActive
                ? 'border-b-2 border-blue-600 text-blue-600 font-semibold'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

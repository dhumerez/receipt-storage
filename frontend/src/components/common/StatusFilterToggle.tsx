import { COMMON } from '../../constants/strings/common.ts';

type Status = 'all' | 'active' | 'inactive';

interface StatusFilterToggleProps {
  value: Status;
  onChange: (status: Status) => void;
}

const OPTIONS: { value: Status; label: string }[] = [
  { value: 'all', label: COMMON.filterAll },
  { value: 'active', label: COMMON.filterActive },
  { value: 'inactive', label: COMMON.filterInactive },
];

export default function StatusFilterToggle({ value, onChange }: StatusFilterToggleProps) {
  return (
    <div className="flex rounded-md border border-gray-300 overflow-hidden">
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`px-3 py-1.5 text-sm border-r last:border-r-0 border-gray-300 ${
            value === opt.value
              ? 'bg-blue-600 text-white font-medium'
              : 'bg-white text-gray-600 hover:bg-gray-50'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

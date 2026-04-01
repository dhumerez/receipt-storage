import type { ReactNode } from 'react';

interface ReportFilterBarProps {
  dateFrom: string;
  dateTo: string;
  showSettled: boolean;
  onDateFromChange: (v: string) => void;
  onDateToChange: (v: string) => void;
  onShowSettledChange: (v: boolean) => void;
  children?: ReactNode;
}

export default function ReportFilterBar({
  dateFrom,
  dateTo,
  showSettled,
  onDateFromChange,
  onDateToChange,
  onShowSettledChange,
  children,
}: ReportFilterBarProps) {
  return (
    <div className="flex flex-wrap gap-4 items-end p-4 bg-white rounded-lg border border-gray-200">
      {children}

      <div className="flex flex-col gap-1">
        <label className="text-xs uppercase tracking-wider text-gray-500">From</label>
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => onDateFromChange(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs uppercase tracking-wider text-gray-500">To</label>
        <input
          type="date"
          value={dateTo}
          onChange={(e) => onDateToChange(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      <div className="flex items-center gap-2 pb-1">
        <input
          type="checkbox"
          id="show-settled"
          checked={showSettled}
          onChange={(e) => onShowSettledChange(e.target.checked)}
          className="rounded border-gray-300"
        />
        <label htmlFor="show-settled" className="text-xs uppercase tracking-wider text-gray-500 cursor-pointer">
          Show settled clients
        </label>
      </div>
    </div>
  );
}

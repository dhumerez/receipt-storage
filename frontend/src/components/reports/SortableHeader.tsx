interface SortableHeaderProps {
  label: string;
  sortKey: string;
  activeSortKey: string;
  sortDir: 'asc' | 'desc';
  onSort: (key: string) => void;
}

export default function SortableHeader({
  label,
  sortKey,
  activeSortKey,
  sortDir,
  onSort,
}: SortableHeaderProps) {
  const isActive = sortKey === activeSortKey;

  const ariaSortValue: 'ascending' | 'descending' | 'none' = isActive
    ? sortDir === 'asc'
      ? 'ascending'
      : 'descending'
    : 'none';

  return (
    <th
      className="px-4 py-3 text-xs uppercase tracking-wider text-gray-500 cursor-pointer select-none"
      onClick={() => onSort(sortKey)}
      aria-sort={ariaSortValue}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {isActive ? (
          sortDir === 'asc' ? (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-4 h-4 text-blue-600"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4.5 15.75l7.5-7.5 7.5 7.5"
              />
            </svg>
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-4 h-4 text-blue-600"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19.5 8.25l-7.5 7.5-7.5-7.5"
              />
            </svg>
          )
        ) : (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="w-4 h-4 text-gray-300"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M8.25 15L12 18.75 15.75 15m-7.5-6L12 5.25 15.75 9"
            />
          </svg>
        )}
      </span>
    </th>
  );
}

interface ClientStatusBadgeProps {
  isActive: boolean;
}

export default function ClientStatusBadge({ isActive }: ClientStatusBadgeProps) {
  return (
    <span
      aria-label={`Status: ${isActive ? 'Active' : 'Inactive'}`}
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
        isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
      }`}
    >
      {isActive ? 'Active' : 'Inactive'}
    </span>
  );
}

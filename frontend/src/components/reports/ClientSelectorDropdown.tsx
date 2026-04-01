import { useQuery } from '@tanstack/react-query';
import { getClients } from '../../api/clients.ts';

interface ClientSelectorDropdownProps {
  selectedClientId: string;
  onSelect: (id: string) => void;
}

export default function ClientSelectorDropdown({
  selectedClientId,
  onSelect,
}: ClientSelectorDropdownProps) {
  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => getClients({}),
    staleTime: 60_000,
  });

  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs uppercase tracking-wider text-gray-500">
        Client
      </label>
      <select
        value={selectedClientId}
        onChange={(e) => onSelect(e.target.value)}
        className="border border-gray-300 rounded-md px-3 py-1.5 text-sm"
      >
        <option value="">Select a client...</option>
        {clients.map((c) => (
          <option key={c.id} value={c.id}>
            {c.fullName}
          </option>
        ))}
      </select>
    </div>
  );
}

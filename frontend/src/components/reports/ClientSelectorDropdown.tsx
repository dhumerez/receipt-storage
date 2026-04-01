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
    queryKey: ['clients', { search: '', status: '' }],
    queryFn: () => getClients({ search: '', status: '' }),
  });

  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs uppercase tracking-wider text-gray-500">Client</label>
      <select
        value={selectedClientId}
        onChange={(e) => onSelect(e.target.value)}
        className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
      >
        <option value="">Select a client...</option>
        {clients.map((client) => (
          <option key={client.id} value={client.id}>
            {client.fullName}
          </option>
        ))}
      </select>
    </div>
  );
}

import type { ClientListItem } from '../../api/clients.ts';
import ClientTableRow from './ClientTableRow.tsx';

interface ClientTableProps {
  clients: ClientListItem[];
  onRowClick: (id: string) => void;
}

export default function ClientTable({ clients, onRowClick }: ClientTableProps) {
  return (
    <div className="w-full border border-gray-200 rounded-lg overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="bg-gray-50">
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Outstanding Balance</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
          </tr>
        </thead>
        <tbody>
          {clients.map((client) => (
            <ClientTableRow key={client.id} client={client} onClick={() => onRowClick(client.id)} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

import type { ClientListItem } from '../../api/clients.ts';
import ClientTableRow from './ClientTableRow.tsx';
import { CLIENTS } from '../../constants/strings/clients.ts';

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
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{CLIENTS.thName}</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{CLIENTS.thPhone}</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{CLIENTS.thOutstandingBalance}</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{CLIENTS.thStatus}</th>
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

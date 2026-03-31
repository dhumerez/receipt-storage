import type { ClientListItem } from '../../api/clients.ts';
import ClientStatusBadge from './ClientStatusBadge.tsx';

interface ClientTableRowProps {
  client: ClientListItem;
  onClick: () => void;
}

export default function ClientTableRow({ client, onClick }: ClientTableRowProps) {
  return (
    <tr
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } }}
      className="hover:bg-gray-50 cursor-pointer border-t border-gray-200"
    >
      <td className="px-4 py-3 text-sm text-gray-900 font-medium">{client.fullName}</td>
      <td className="px-4 py-3 text-sm text-gray-600">{client.phone ?? '—'}</td>
      <td className="px-4 py-3 text-sm text-gray-900">${parseFloat(client.outstandingBalance).toFixed(2)}</td>
      <td className="px-4 py-3"><ClientStatusBadge isActive={client.isActive} /></td>
    </tr>
  );
}

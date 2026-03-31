import { useState, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateProduct } from '../../api/products.ts';
import type { ProductListItem } from '../../api/products.ts';
import ClientStatusBadge from '../clients/ClientStatusBadge.tsx';

// Inline price edit cell — not exported (only used within this file)
function PriceCell({ product }: { product: ProductListItem }) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(product.unitPrice);
  const [rowError, setRowError] = useState('');
  const savedRef = useRef(false);

  const mutation = useMutation({
    mutationFn: (unitPrice: string) => updateProduct(product.id, { unitPrice }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['products'] }); },
    onError: () => { setValue(product.unitPrice); setRowError('Could not save price. Try again.'); },
    onSettled: () => { savedRef.current = false; setEditing(false); },
  });

  const commit = () => {
    if (savedRef.current) return;
    const num = parseFloat(value);
    if (isNaN(num) || num < 0) { setValue(product.unitPrice); setEditing(false); return; }
    savedRef.current = true;
    mutation.mutate(num.toFixed(2));
  };

  if (!editing) {
    return (
      <td
        className="px-4 py-3 text-sm text-gray-900 cursor-pointer hover:bg-blue-50"
        onClick={(e) => { e.stopPropagation(); setRowError(''); setEditing(true); setValue(product.unitPrice); }}
      >
        ${parseFloat(product.unitPrice).toFixed(2)}
      </td>
    );
  }

  return (
    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
      <input
        type="number"
        min="0"
        step="0.01"
        autoFocus
        value={value}
        aria-label={`Unit price for ${product.name}`}
        disabled={mutation.isPending}
        className="w-24 border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { e.preventDefault(); commit(); }
          if (e.key === 'Escape') { setEditing(false); setValue(product.unitPrice); }
        }}
        onBlur={commit}
      />
      {rowError && <div className="text-xs text-red-700 mt-1">{rowError}</div>}
    </td>
  );
}

interface ProductTableRowProps {
  product: ProductListItem;
  onEdit: (product: ProductListItem) => void;
  onDeactivate: (product: ProductListItem) => void;
  onReactivate: (id: string) => void;
}

export default function ProductTableRow({ product, onEdit, onDeactivate, onReactivate }: ProductTableRowProps) {
  return (
    <tr
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onEdit(product); } }}
      className="hover:bg-gray-50 cursor-pointer border-t border-gray-200 min-h-[48px]"
    >
      <td className="px-4 py-3 text-sm text-gray-900">{product.name}</td>
      <PriceCell product={product} />
      <td className="px-4 py-3 text-sm text-gray-600">{product.unit ?? '—'}</td>
      <td className="px-4 py-3">
        <ClientStatusBadge isActive={product.isActive} />
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1">
          {/* Edit icon button */}
          <button
            type="button"
            aria-label={`Edit ${product.name}`}
            onClick={(e) => { e.stopPropagation(); onEdit(product); }}
            className="p-1 rounded hover:bg-gray-100"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-gray-400 hover:text-gray-600">
              <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
            </svg>
          </button>
          {/* Deactivate / Reactivate */}
          {product.isActive ? (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onDeactivate(product); }}
              className="text-sm text-blue-600 hover:underline ml-2"
            >
              Deactivate
            </button>
          ) : (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onReactivate(product.id); }}
              className="text-sm text-blue-600 hover:underline ml-2"
            >
              Reactivate Product
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

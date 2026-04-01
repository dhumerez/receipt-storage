import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getProducts } from '../../api/products.ts';
import type { ProductListItem } from '../../api/products.ts';
import { TRANSACTIONS } from '../../constants/strings/transactions.ts';
import { COMMON } from '../../constants/strings/common.ts';

interface CatalogPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (product: ProductListItem) => void;
}

export default function CatalogPickerModal({ isOpen, onClose, onSelect }: CatalogPickerModalProps) {
  const [search, setSearch] = useState('');

  // Reset search when modal opens
  useEffect(() => {
    if (isOpen) setSearch('');
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  const { data: products = [], isLoading, isError } = useQuery({
    queryKey: ['products', { search, status: 'active' }],
    queryFn: () => getProducts({ search: search || undefined, status: 'active' }),
    enabled: isOpen,
  });

  if (!isOpen) return null;

  const handleSelect = (product: ProductListItem) => {
    onSelect(product);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 p-6 max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">{TRANSACTIONS.selectProduct}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none"
          >
            &times;
          </button>
        </div>

        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={TRANSACTIONS.searchProducts}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm mb-4"
        />

        <div className="flex-1 overflow-y-auto">
          {isLoading && (
            <p className="text-sm text-gray-500 p-3">{COMMON.loading}</p>
          )}
          {isError && (
            <p className="text-sm text-red-600 p-3">
              {TRANSACTIONS.couldntLoadProducts}
            </p>
          )}
          {!isLoading && !isError && products.length === 0 && (
            <p className="text-sm text-gray-500 p-3">{TRANSACTIONS.noProductsFound}</p>
          )}
          {products.map((product) => (
            <div
              key={product.id}
              onClick={() => handleSelect(product)}
              className="hover:bg-gray-50 cursor-pointer p-3 border-b border-gray-100 min-h-[44px] flex items-center justify-between"
            >
              <div>
                <span className="text-sm text-gray-900">{product.name}</span>
                {product.unit && (
                  <span className="text-xs text-gray-500 ml-2">/ {product.unit}</span>
                )}
              </div>
              <span className="text-sm font-semibold text-gray-900">
                ${parseFloat(product.unitPrice).toFixed(2)}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-4 pt-4 border-t border-gray-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            {TRANSACTIONS.backToForm}
          </button>
        </div>
      </div>
    </div>
  );
}

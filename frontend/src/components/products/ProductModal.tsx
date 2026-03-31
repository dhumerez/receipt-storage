import { useState, useEffect, useCallback, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createProduct, updateProduct } from '../../api/products.ts';
import type { ProductListItem, CreateProductInput } from '../../api/products.ts';

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  editData?: ProductListItem | null;
}

export default function ProductModal({ isOpen, onClose, editData }: ProductModalProps) {
  const queryClient = useQueryClient();
  const firstInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState('');
  const [unitPrice, setUnitPrice] = useState('');
  const [unit, setUnit] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');

  // Pre-fill form when editing
  useEffect(() => {
    if (editData) {
      setName(editData.name);
      setUnitPrice(editData.unitPrice);
      setUnit(editData.unit ?? '');
      setDescription(editData.description ?? '');
    } else {
      setName('');
      setUnitPrice('');
      setUnit('');
      setDescription('');
    }
    setError('');
  }, [editData, isOpen]);

  // Focus first input on open
  useEffect(() => {
    if (isOpen) { setTimeout(() => firstInputRef.current?.focus(), 50); }
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  const mutation = useMutation({
    mutationFn: (data: CreateProductInput) =>
      editData ? updateProduct(editData.id, data) : createProduct(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      onClose();
    },
    onError: () => setError("Couldn't save changes. Check your connection and try again."),
  });

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const price = parseFloat(unitPrice);
    const input: CreateProductInput = {
      name: name.trim(),
      unitPrice: isNaN(price) ? '0.00' : price.toFixed(2),
      unit: unit.trim() || undefined,
      description: description.trim() || undefined,
    };
    mutation.mutate(input);
  }, [name, unitPrice, unit, description, mutation]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">
            {editData ? 'Edit Product' : 'Add Product'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">{error}</div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-normal text-gray-700 mb-1">Name</label>
            <input
              ref={firstInputRef}
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-normal text-gray-700 mb-1">Unit Price</label>
            <input
              type="number"
              min="0"
              step="0.01"
              required
              placeholder="0.00"
              value={unitPrice}
              onChange={(e) => setUnitPrice(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-normal text-gray-700 mb-1">Unit of Measure <span className="text-gray-400">(optional)</span></label>
            <input
              type="text"
              placeholder="e.g., box, unit, kg"
              maxLength={50}
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-normal text-gray-700 mb-1">Description <span className="text-gray-400">(optional)</span></label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
            />
          </div>
          <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-gray-200">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">
              Discard Changes
            </button>
            <button type="submit" disabled={mutation.isPending}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed">
              {mutation.isPending ? 'Saving...' : (editData ? 'Save Changes' : 'Create Product')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

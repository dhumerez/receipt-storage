import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deactivateProduct } from '../../api/products.ts';
import { PRODUCTS } from '../../constants/strings/products.ts';

interface DeactivateProductModalProps {
  isOpen: boolean;
  productId: string;
  productName: string;
  onClose: () => void;
  // NO redirectAfter — products list page stays mounted
}

export default function DeactivateProductModal({ isOpen, productId, productName: _productName, onClose }: DeactivateProductModalProps) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => deactivateProduct(productId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      onClose();
    },
  });

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-3">{PRODUCTS.deactivateProductQuestion}</h2>
        <p className="text-sm text-gray-600 mb-6">
          {PRODUCTS.deactivateProductBody}
        </p>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose}
            className="px-4 py-2 text-sm border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">
            {PRODUCTS.keepProduct}
          </button>
          <button type="button" onClick={() => mutation.mutate()} disabled={mutation.isPending}
            className="px-4 py-2 text-sm border border-red-300 rounded-md text-red-700 hover:bg-red-50 disabled:opacity-50">
            {mutation.isPending ? PRODUCTS.deactivating : PRODUCTS.deactivateProduct}
          </button>
        </div>
      </div>
    </div>
  );
}

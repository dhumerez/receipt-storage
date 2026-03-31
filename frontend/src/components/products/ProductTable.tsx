import type { ProductListItem } from '../../api/products.ts';
import ProductTableRow from './ProductTableRow.tsx';

interface ProductTableProps {
  products: ProductListItem[];
  onEdit: (product: ProductListItem) => void;
  onDeactivate: (product: ProductListItem) => void;
  onReactivate: (id: string) => void;
}

export default function ProductTable({ products, onEdit, onDeactivate, onReactivate }: ProductTableProps) {
  return (
    <div className="w-full border border-gray-200 rounded-lg overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="bg-gray-50">
            <th className="px-4 py-3 text-left text-xs font-normal text-gray-500 uppercase tracking-wider">Name</th>
            <th className="px-4 py-3 text-left text-xs font-normal text-gray-500 uppercase tracking-wider">Unit Price</th>
            <th className="px-4 py-3 text-left text-xs font-normal text-gray-500 uppercase tracking-wider">Unit</th>
            <th className="px-4 py-3 text-left text-xs font-normal text-gray-500 uppercase tracking-wider">Status</th>
            <th className="px-4 py-3 text-left text-xs font-normal text-gray-500 uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody>
          {products.map((product) => (
            <ProductTableRow
              key={product.id}
              product={product}
              onEdit={onEdit}
              onDeactivate={onDeactivate}
              onReactivate={onReactivate}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

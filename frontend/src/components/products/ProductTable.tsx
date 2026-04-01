import type { ProductListItem } from '../../api/products.ts';
import ProductTableRow from './ProductTableRow.tsx';
import { PRODUCTS } from '../../constants/strings/products.ts';

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
            <th className="px-4 py-3 text-left text-xs font-normal text-gray-500 uppercase tracking-wider">{PRODUCTS.thName}</th>
            <th className="px-4 py-3 text-left text-xs font-normal text-gray-500 uppercase tracking-wider">{PRODUCTS.thUnitPrice}</th>
            <th className="px-4 py-3 text-left text-xs font-normal text-gray-500 uppercase tracking-wider">{PRODUCTS.thUnit}</th>
            <th className="px-4 py-3 text-left text-xs font-normal text-gray-500 uppercase tracking-wider">{PRODUCTS.thStatus}</th>
            <th className="px-4 py-3 text-left text-xs font-normal text-gray-500 uppercase tracking-wider">{PRODUCTS.thActions}</th>
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

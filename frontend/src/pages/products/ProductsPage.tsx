import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getProducts, reactivateProduct } from '../../api/products.ts';
import type { ProductListItem } from '../../api/products.ts';
import ProductTable from '../../components/products/ProductTable.tsx';
import ProductModal from '../../components/products/ProductModal.tsx';
import DeactivateProductModal from '../../components/products/DeactivateProductModal.tsx';
import SearchBar from '../../components/common/SearchBar.tsx';
import StatusFilterToggle from '../../components/common/StatusFilterToggle.tsx';
import EmptyState from '../../components/common/EmptyState.tsx';
import { PRODUCTS } from '../../constants/strings/products.ts';

export default function ProductsPage() {
  const queryClient = useQueryClient();
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | 'active' | 'inactive'>('active');
  const [modalOpen, setModalOpen] = useState(false);
  const [editProduct, setEditProduct] = useState<ProductListItem | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<ProductListItem | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // 300ms debounce on search input (UI-SPEC)
  useEffect(() => {
    if (debounceRef.current !== undefined) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setSearch(searchInput), 300);
    return () => { if (debounceRef.current !== undefined) clearTimeout(debounceRef.current); };
  }, [searchInput]);

  const { data: products = [], isLoading, error } = useQuery({
    queryKey: ['products', { search, status }],
    queryFn: () => getProducts({ search, status }),
    staleTime: 30_000,
  });

  const reactivateMutation = useMutation({
    mutationFn: (id: string) => reactivateProduct(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['products'] }),
  });

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="text-sm text-gray-400">{PRODUCTS.loadingProducts}</div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">{PRODUCTS.pageTitle}</h1>
        <button
          type="button"
          onClick={() => { setEditProduct(null); setModalOpen(true); }}
          className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
        >
          {PRODUCTS.addProduct}
        </button>
      </div>

      {/* Error banner */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
          {PRODUCTS.errorLoadingProducts}
        </div>
      )}

      {/* Search + Filter */}
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <div className="flex-1">
          <SearchBar
            value={searchInput}
            onChange={setSearchInput}
            placeholder={PRODUCTS.searchPlaceholder}
          />
        </div>
        <StatusFilterToggle value={status} onChange={setStatus} />
      </div>

      {/* Table or empty state */}
      {products.length === 0 ? (
        <EmptyState
          heading={
            search
              ? PRODUCTS.noProductsMatchSearch
              : status === 'inactive'
              ? PRODUCTS.noInactiveProducts
              : PRODUCTS.noProductsYet
          }
          body={
            search
              ? PRODUCTS.tryDifferentSearch
              : status === 'inactive'
              ? PRODUCTS.deactivatedProductsAppearHere
              : PRODUCTS.addFirstProduct
          }
          ctaLabel={!search && status !== 'inactive' ? PRODUCTS.addProduct : undefined}
          onCta={!search && status !== 'inactive' ? () => { setEditProduct(null); setModalOpen(true); } : undefined}
        />
      ) : (
        <ProductTable
          products={products}
          onEdit={(p) => { setEditProduct(p); setModalOpen(true); }}
          onDeactivate={(p) => setDeactivateTarget(p)}
          onReactivate={(id) => reactivateMutation.mutate(id)}
        />
      )}

      {/* Create/Edit Modal */}
      <ProductModal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setEditProduct(null); }}
        editData={editProduct}
      />

      {/* Deactivate Confirm Modal */}
      {deactivateTarget && (
        <DeactivateProductModal
          isOpen={true}
          productId={deactivateTarget.id}
          productName={deactivateTarget.name}
          onClose={() => setDeactivateTarget(null)}
        />
      )}
    </div>
  );
}

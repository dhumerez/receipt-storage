export interface LineItemRow {
  id: string;
  productId?: string;
  description: string;
  quantity: string;
  unitPrice: string;
  isCatalog: boolean;
}

interface LineItemBuilderProps {
  items: LineItemRow[];
  onChange: (items: LineItemRow[]) => void;
  onOpenCatalog: () => void;
}

function computeLineTotal(quantity: string, unitPrice: string): string {
  const qty = parseFloat(quantity || '0');
  const price = parseFloat(unitPrice || '0');
  return (qty * price).toFixed(2);
}

function computeRunningTotal(items: LineItemRow[]): string {
  return items
    .reduce((sum, item) => {
      const qty = parseFloat(item.quantity || '0');
      const price = parseFloat(item.unitPrice || '0');
      return sum + qty * price;
    }, 0)
    .toFixed(2);
}

const inputClass =
  'w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm';

export default function LineItemBuilder({ items, onChange, onOpenCatalog }: LineItemBuilderProps) {
  const updateItem = (id: string, field: keyof LineItemRow, value: string) => {
    onChange(
      items.map((item) => (item.id === id ? { ...item, [field]: value } : item)),
    );
  };

  const removeItem = (id: string) => {
    onChange(items.filter((item) => item.id !== id));
  };

  const addFreeForm = () => {
    onChange([
      ...items,
      {
        id: crypto.randomUUID(),
        description: '',
        quantity: '1',
        unitPrice: '',
        isCatalog: false,
      },
    ]);
  };

  return (
    <div>
      {items.length === 0 ? (
        <p className="text-sm text-gray-500">Add line items using the buttons below.</p>
      ) : (
        <>
          {/* Desktop header */}
          <div className="hidden sm:grid grid-cols-[1fr_80px_100px_100px_32px] gap-2 mb-2">
            <span className="text-xs font-normal text-gray-500 uppercase tracking-wider">Name</span>
            <span className="text-xs font-normal text-gray-500 uppercase tracking-wider">Qty</span>
            <span className="text-xs font-normal text-gray-500 uppercase tracking-wider">Unit Price</span>
            <span className="text-xs font-normal text-gray-500 uppercase tracking-wider text-right">Total</span>
            <span />
          </div>

          {items.map((item) => (
            <div key={item.id}>
              {/* Desktop row */}
              <div className="hidden sm:grid grid-cols-[1fr_80px_100px_100px_32px] gap-2 mb-2 items-center min-h-[44px]">
                {item.isCatalog ? (
                  <div className={`${inputClass} bg-gray-50 cursor-default`}>
                    {item.description}
                  </div>
                ) : (
                  <input
                    type="text"
                    value={item.description}
                    onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                    placeholder="Item name"
                    className={inputClass}
                  />
                )}
                <input
                  type="number"
                  min="0.001"
                  step="0.001"
                  value={item.quantity}
                  onChange={(e) => updateItem(item.id, 'quantity', e.target.value)}
                  className={inputClass}
                />
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={item.unitPrice}
                  onChange={(e) => updateItem(item.id, 'unitPrice', e.target.value)}
                  className={inputClass}
                />
                <span className="text-sm text-gray-900 text-right">
                  ${computeLineTotal(item.quantity, item.unitPrice)}
                </span>
                <button
                  type="button"
                  onClick={() => removeItem(item.id)}
                  className="text-gray-400 hover:text-red-500 text-lg leading-none"
                  aria-label="Remove item"
                >
                  &times;
                </button>
              </div>

              {/* Mobile row (stacked) */}
              <div className="sm:hidden mb-4 p-3 border border-gray-200 rounded-md space-y-2">
                <div className="flex justify-between items-start">
                  <span className="text-xs text-gray-500 uppercase">Name</span>
                  <button
                    type="button"
                    onClick={() => removeItem(item.id)}
                    className="text-gray-400 hover:text-red-500 text-lg leading-none"
                    aria-label="Remove item"
                  >
                    &times;
                  </button>
                </div>
                {item.isCatalog ? (
                  <div className={`${inputClass} bg-gray-50 cursor-default`}>
                    {item.description}
                  </div>
                ) : (
                  <input
                    type="text"
                    value={item.description}
                    onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                    placeholder="Item name"
                    className={inputClass}
                  />
                )}
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <span className="text-xs text-gray-500 uppercase block mb-1">Qty</span>
                    <input
                      type="number"
                      min="0.001"
                      step="0.001"
                      value={item.quantity}
                      onChange={(e) => updateItem(item.id, 'quantity', e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 uppercase block mb-1">Price</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.unitPrice}
                      onChange={(e) => updateItem(item.id, 'unitPrice', e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 uppercase block mb-1">Total</span>
                    <div className="text-sm text-gray-900 py-2 text-right">
                      ${computeLineTotal(item.quantity, item.unitPrice)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* Running total */}
          <div className="text-right mt-2">
            <span className="text-sm font-semibold text-gray-900">
              Total: ${computeRunningTotal(items)}
            </span>
          </div>
        </>
      )}

      {/* Add buttons */}
      <div className="flex gap-2 mt-3">
        <button
          type="button"
          onClick={onOpenCatalog}
          className="border border-gray-300 text-gray-700 hover:bg-gray-50 px-3 py-1.5 rounded-md text-sm"
        >
          + Catalog
        </button>
        <button
          type="button"
          onClick={addFreeForm}
          className="border border-gray-300 text-gray-700 hover:bg-gray-50 px-3 py-1.5 rounded-md text-sm"
        >
          + Free-form
        </button>
      </div>
    </div>
  );
}

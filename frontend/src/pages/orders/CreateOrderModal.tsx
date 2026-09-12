import { useState, useEffect, type FormEvent } from 'react';
import { X, Loader2, Plus, Trash2 } from 'lucide-react';
import { createOrder, fetchItems, fetchLocations } from '../../lib/api';
import type { Item, Location } from '../../types/inventory';
import type { CreateOrderLineItem } from '../../types/order';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateOrderModal({ isOpen, onClose, onSuccess }: Props) {
  const [items, setItems] = useState<Item[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  
  const [lineItems, setLineItems] = useState<CreateOrderLineItem[]>([
    { itemId: '', locationId: '', quantity: 1 }
  ]);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      Promise.all([fetchItems(), fetchLocations()])
        .then(([itemsData, locsData]) => {
          setItems(itemsData);
          setLocations(locsData);
        })
        .catch(() => setError('Failed to load reference data.'));
    } else {
      setLineItems([{ itemId: '', locationId: '', quantity: 1 }]);
      setError('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const addLineItem = () => {
    setLineItems([...lineItems, { itemId: '', locationId: '', quantity: 1 }]);
  };

  const removeLineItem = (index: number) => {
    const newItems = [...lineItems];
    newItems.splice(index, 1);
    setLineItems(newItems);
  };

  const updateLineItem = (index: number, field: keyof CreateOrderLineItem, value: any) => {
    const newItems = [...lineItems];
    newItems[index] = { ...newItems[index], [field]: value };
    setLineItems(newItems);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (lineItems.length === 0) {
      setError('Order must contain at least one item.');
      return;
    }

    // Client side duplicate check
    const pairs = new Set<string>();
    for (const item of lineItems) {
      if (item.quantity <= 0) {
        setError('Quantity must be greater than 0 for all items.');
        return;
      }
      const key = `${item.itemId}-${item.locationId}`;
      if (pairs.has(key)) {
        setError('Duplicate item and location combination detected. Please merge them into a single line item.');
        return;
      }
      pairs.add(key);
    }

    setIsSubmitting(true);

    try {
      await createOrder({ items: lineItems });
      onSuccess();
      onClose();
    } catch (err: any) {
      if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else {
        setError('Failed to create order.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] border border-slate-100">
        <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-slate-50/50">
          <h2 className="text-xl font-extrabold text-slate-900">Create Customer Order</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && (
            <div className="p-4 bg-red-50 text-red-700 rounded-xl text-sm border border-red-200 font-medium">
              {error}
            </div>
          )}

          <div className="bg-brand-50 border border-brand-200 text-brand-800 p-4 rounded-xl text-sm mb-4 shadow-sm font-medium">
            <strong className="font-bold">Note:</strong> Creating an order does NOT reserve inventory automatically. Reservation must be explicitly triggered from the Order Details after creation.
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-end mb-2">
              <h3 className="text-lg font-bold text-slate-900">Order Items</h3>
            </div>
            
            {lineItems.map((li, index) => (
              <div key={index} className="flex gap-4 items-end p-5 border border-slate-200 rounded-2xl bg-slate-50/50 shadow-sm transition-all hover:shadow-md">
                <div className="flex-1">
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">Item</label>
                  <select
                    required
                    value={li.itemId}
                    onChange={e => updateLineItem(index, 'itemId', e.target.value)}
                    className="w-full border border-slate-200 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 shadow-sm transition-all"
                  >
                    <option value="">Select Item...</option>
                    {items.map(item => (
                      <option key={item.id} value={item.id}>{item.name} ({item.sku})</option>
                    ))}
                  </select>
                </div>

                <div className="flex-1">
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">Location</label>
                  <select
                    required
                    value={li.locationId}
                    onChange={e => updateLineItem(index, 'locationId', e.target.value)}
                    className="w-full border border-slate-200 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 shadow-sm transition-all"
                  >
                    <option value="">Select Location...</option>
                    {locations.map(loc => (
                      <option key={loc.id} value={loc.id}>{loc.code}</option>
                    ))}
                  </select>
                </div>

                <div className="w-28">
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">Quantity</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={li.quantity}
                    onChange={e => updateLineItem(index, 'quantity', parseInt(e.target.value) || 0)}
                    className="w-full border border-slate-200 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 shadow-sm transition-all font-bold"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => removeLineItem(index)}
                  disabled={lineItems.length === 1}
                  className="p-2.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-xl disabled:opacity-30 disabled:hover:bg-transparent transition-colors border border-transparent hover:border-red-100"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={addLineItem}
            className="flex items-center text-sm text-brand-600 hover:text-brand-800 font-bold py-2 px-3 bg-brand-50 hover:bg-brand-100 rounded-lg transition-colors border border-brand-100 w-fit"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Add Line Item
          </button>
        </form>

        <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 hover:text-slate-900 rounded-xl font-bold transition-all shadow-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-5 py-2.5 text-slate-900 bg-brand-500 hover:bg-brand-400 rounded-xl font-bold flex items-center transition-all shadow-sm disabled:opacity-50"
          >
            {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Create Order
          </button>
        </div>
      </div>
    </div>
  );
}

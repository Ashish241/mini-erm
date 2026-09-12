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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900 bg-opacity-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-xl font-bold text-gray-900">Create Customer Order</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm border border-red-200">
              {error}
            </div>
          )}

          <div className="bg-yellow-50 text-yellow-800 p-3 rounded-lg text-sm mb-4">
            <strong>Note:</strong> Creating an order does NOT reserve inventory automatically. Reservation must be explicitly triggered from the Order Details after creation.
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-end mb-2">
              <h3 className="text-lg font-semibold text-gray-900">Order Items</h3>
            </div>
            
            {lineItems.map((li, index) => (
              <div key={index} className="flex gap-3 items-end p-4 border border-gray-200 rounded-lg bg-gray-50">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Item</label>
                  <select
                    required
                    value={li.itemId}
                    onChange={e => updateLineItem(index, 'itemId', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-yellow-500 focus:border-yellow-500"
                  >
                    <option value="">Select Item...</option>
                    {items.map(item => (
                      <option key={item.id} value={item.id}>{item.name} ({item.sku})</option>
                    ))}
                  </select>
                </div>

                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Location</label>
                  <select
                    required
                    value={li.locationId}
                    onChange={e => updateLineItem(index, 'locationId', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-yellow-500 focus:border-yellow-500"
                  >
                    <option value="">Select Location...</option>
                    {locations.map(loc => (
                      <option key={loc.id} value={loc.id}>{loc.code}</option>
                    ))}
                  </select>
                </div>

                <div className="w-24">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Quantity</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={li.quantity}
                    onChange={e => updateLineItem(index, 'quantity', parseInt(e.target.value) || 0)}
                    className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-yellow-500 focus:border-yellow-500"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => removeLineItem(index)}
                  disabled={lineItems.length === 1}
                  className="p-2 text-red-500 hover:bg-red-50 rounded-lg disabled:opacity-30 disabled:hover:bg-transparent"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={addLineItem}
            className="flex items-center text-sm text-yellow-600 hover:text-yellow-800 font-medium py-2"
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Line Item
          </button>
        </form>

        <div className="p-6 border-t bg-gray-50 flex justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-4 py-2 text-white bg-yellow-600 hover:bg-yellow-700 rounded-lg font-medium flex items-center transition-colors disabled:opacity-50"
          >
            {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Create Order
          </button>
        </div>
      </div>
    </div>
  );
}

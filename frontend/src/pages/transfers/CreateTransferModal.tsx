import { useState, useEffect, type FormEvent } from 'react';
import { X, Loader2, ArrowRight } from 'lucide-react';
import { createTransfer, fetchItems, fetchLocations } from '../../lib/api';
import type { Item, Location } from '../../types/inventory';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateTransferModal({ isOpen, onClose, onSuccess }: Props) {
  const [items, setItems] = useState<Item[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  
  const [itemId, setItemId] = useState('');
  const [sourceLocationId, setSourceLocationId] = useState('');
  const [destinationLocationId, setDestinationLocationId] = useState('');
  const [quantity, setQuantity] = useState(1);
  
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
      setItemId('');
      setSourceLocationId('');
      setDestinationLocationId('');
      setQuantity(1);
      setError('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (quantity <= 0) {
      setError('Quantity must be greater than 0.');
      return;
    }
    
    if (sourceLocationId === destinationLocationId) {
      setError('Source and destination locations must be different.');
      return;
    }

    setIsSubmitting(true);

    try {
      await createTransfer({
        itemId,
        sourceLocationId,
        destinationLocationId,
        quantity,
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else {
        setError('Failed to create transfer.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900 bg-opacity-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-xl font-bold text-gray-900">Request Transfer</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm border border-red-200">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Item to Transfer</label>
            <select
              required
              value={itemId}
              onChange={e => setItemId(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select Item...</option>
              {items.map(item => (
                <option key={item.id} value={item.id}>{item.name} ({item.sku})</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-[1fr,auto,1fr] gap-2 items-end">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">From Source</label>
              <select
                required
                value={sourceLocationId}
                onChange={e => setSourceLocationId(e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select...</option>
                {locations.map(loc => (
                  <option key={loc.id} value={loc.id}>{loc.code}</option>
                ))}
              </select>
            </div>
            
            <div className="pb-3 text-gray-400">
              <ArrowRight className="h-5 w-5" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">To Destination</label>
              <select
                required
                value={destinationLocationId}
                onChange={e => setDestinationLocationId(e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select...</option>
                {locations.map(loc => (
                  <option key={loc.id} value={loc.id}>{loc.code}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
            <input
              type="number"
              required
              min="1"
              value={quantity}
              onChange={e => setQuantity(parseInt(e.target.value) || 0)}
              className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="pt-4 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-white bg-blue-600 hover:bg-blue-700 rounded-lg font-medium flex items-center transition-colors disabled:opacity-50"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Request Transfer
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

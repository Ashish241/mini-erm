import { useState, type FormEvent } from 'react';
import { X, Loader2, AlertTriangle } from 'lucide-react';
import { adjustStock } from '../../lib/api';
import type { InventoryRecord } from '../../types/inventory';

interface Props {
  record: InventoryRecord | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AdjustStockModal({ record, onClose, onSuccess }: Props) {
  const [quantityChange, setQuantityChange] = useState<number>(0);
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!record) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (quantityChange === 0) {
      setError('Adjustment quantity cannot be zero.');
      return;
    }

    if (record.physicalQuantity + quantityChange < record.reservedQuantity) {
      setError('Cannot reduce physical quantity below reserved quantity.');
      return;
    }

    setError('');
    setIsSubmitting(true);

    try {
      await adjustStock(record.id, { adjustment: quantityChange, reason });
      onSuccess();
      onClose();
    } catch (err: any) {
      if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else {
        setError('Failed to adjust stock.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const newPhysical = record.physicalQuantity + quantityChange;
  const newAvailable = newPhysical - record.reservedQuantity;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900 bg-opacity-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="flex justify-between items-center p-6 border-b bg-gray-50">
          <h2 className="text-xl font-bold text-gray-900">Adjust Physical Stock</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="bg-gray-100 p-4 rounded-lg text-sm mb-4">
            <p><strong>Item:</strong> {record.item.name} ({record.item.sku})</p>
            <p><strong>Location:</strong> {record.location.name}</p>
            <div className="mt-2 grid grid-cols-2 gap-2 text-gray-600">
              <div>Physical: {record.physicalQuantity}</div>
              <div>Reserved: {record.reservedQuantity}</div>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm border border-red-200 flex items-start">
              <AlertTriangle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Quantity Change (+ / -)
            </label>
            <input
              type="number"
              required
              value={quantityChange}
              onChange={e => setQuantityChange(parseInt(e.target.value) || 0)}
              className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Use positive numbers to add stock, negative to remove stock.
            </p>
          </div>

          <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg text-sm">
            <p className="text-blue-800 font-medium mb-1">Projected Stock:</p>
            <div className="flex justify-between text-blue-900">
              <span>New Physical: {newPhysical}</span>
              <span>New Available: {newAvailable}</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reason for Adjustment</label>
            <input
              type="text"
              required
              maxLength={255}
              placeholder="e.g. Audit correction, damage"
              value={reason}
              onChange={e => setReason(e.target.value)}
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
              disabled={isSubmitting || quantityChange === 0}
              className="px-4 py-2 text-white bg-blue-600 hover:bg-blue-700 rounded-lg font-medium flex items-center transition-colors disabled:opacity-50"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Confirm Adjustment
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

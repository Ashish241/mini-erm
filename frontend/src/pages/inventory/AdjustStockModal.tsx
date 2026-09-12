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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-100">
        <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-slate-50/50">
          <h2 className="text-xl font-extrabold text-slate-900">Adjust Physical Stock</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="bg-slate-50 p-4 rounded-xl text-sm mb-4 border border-slate-100">
            <p className="font-medium text-slate-900"><span className="text-slate-500 font-normal">Item:</span> {record.item.name} <span className="font-mono text-xs bg-white px-1 py-0.5 rounded border border-slate-200">{record.item.sku}</span></p>
            <p className="font-medium text-slate-900 mt-1"><span className="text-slate-500 font-normal">Location:</span> {record.location.name}</p>
            <div className="mt-3 grid grid-cols-2 gap-2 text-slate-600 bg-white p-2 rounded-lg border border-slate-100">
              <div className="flex flex-col"><span className="text-xs text-slate-400 uppercase tracking-wider font-bold">Physical</span> <span className="font-bold text-slate-900">{record.physicalQuantity}</span></div>
              <div className="flex flex-col border-l border-slate-100 pl-2"><span className="text-xs text-slate-400 uppercase tracking-wider font-bold">Reserved</span> <span className="font-bold text-slate-900">{record.reservedQuantity}</span></div>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm border border-red-200 flex items-start">
              <AlertTriangle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">
              Quantity Change (+ / -)
            </label>
            <input
              type="number"
              required
              value={quantityChange}
              onChange={e => setQuantityChange(parseInt(e.target.value) || 0)}
              className="w-full border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 shadow-sm transition-all text-lg font-bold"
            />
            <p className="text-xs text-slate-500 mt-2 font-medium">
              Use positive numbers to add stock, negative to remove stock.
            </p>
          </div>

          <div className="p-4 bg-brand-50 border border-brand-100 rounded-xl text-sm">
            <p className="text-brand-800 font-bold mb-2">Projected Stock:</p>
            <div className="flex justify-between text-brand-900 bg-white/50 p-2 rounded-lg">
              <span className="font-medium">New Physical: <strong className="font-extrabold">{newPhysical}</strong></span>
              <span className="font-medium">New Available: <strong className="font-extrabold">{newAvailable}</strong></span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">Reason for Adjustment</label>
            <input
              type="text"
              required
              maxLength={255}
              placeholder="e.g. Audit correction, damage"
              value={reason}
              onChange={e => setReason(e.target.value)}
              className="w-full border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 shadow-sm transition-all"
            />
          </div>

          <div className="pt-6 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || quantityChange === 0}
              className="px-5 py-2.5 text-slate-900 bg-brand-500 hover:bg-brand-400 rounded-xl font-bold flex items-center transition-all shadow-sm disabled:opacity-50"
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

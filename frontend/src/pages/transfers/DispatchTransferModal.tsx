import { useState, type FormEvent } from 'react';
import { X, Loader2, Truck } from 'lucide-react';
import { dispatchTransfer } from '../../lib/api';
import type { TransferRecord } from '../../types/transfer';

interface Props {
  transfer: TransferRecord | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function DispatchTransferModal({ transfer, onClose, onSuccess }: Props) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!transfer) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      await dispatchTransfer(transfer.id);
      onSuccess();
      onClose();
    } catch (err: any) {
      if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else {
        setError('Failed to dispatch transfer.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-100">
        <div className="flex justify-between items-center p-6 border-b border-brand-100 bg-brand-50/50">
          <h2 className="text-xl font-extrabold text-brand-900 flex items-center">
            <Truck className="h-5 w-5 mr-2 text-brand-600" />
            Dispatch Transfer
          </h2>
          <button onClick={onClose} className="text-brand-400 hover:text-brand-600 transition-colors">
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="text-center text-sm text-slate-600 mb-4 font-medium">
            Are you sure you want to dispatch <strong className="text-slate-900 bg-slate-100 px-1 py-0.5 rounded">{transfer.transferNumber}</strong>?
          </div>

          <div className="bg-brand-50 border border-brand-200 text-brand-800 p-4 rounded-xl text-sm shadow-sm font-medium">
            <strong className="font-bold">Warning:</strong> Dispatching will immediately deduct <strong className="font-extrabold text-brand-900 bg-white px-1 rounded shadow-sm">{transfer.quantity}</strong> units of {transfer.item.name} from the source location ({transfer.sourceLocation.code}).
          </div>

          {error && (
            <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm border border-red-200 text-center">
              {error}
            </div>
          )}

          <div className="pt-4 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 text-slate-900 bg-brand-500 hover:bg-brand-400 rounded-xl font-bold flex items-center transition-all shadow-sm disabled:opacity-50"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Confirm Dispatch
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

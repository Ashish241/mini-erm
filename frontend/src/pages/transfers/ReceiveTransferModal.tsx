import { useState, type FormEvent } from 'react';
import { X, Loader2, PackageCheck } from 'lucide-react';
import { receiveTransfer } from '../../lib/api';
import type { TransferRecord } from '../../types/transfer';

interface Props {
  transfer: TransferRecord | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ReceiveTransferModal({ transfer, onClose, onSuccess }: Props) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!transfer) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      await receiveTransfer(transfer.id);
      onSuccess();
      onClose();
    } catch (err: any) {
      if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else {
        setError('Failed to receive transfer.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-100">
        <div className="flex justify-between items-center p-6 border-b border-emerald-100 bg-emerald-50/50">
          <h2 className="text-xl font-extrabold text-emerald-900 flex items-center">
            <PackageCheck className="h-5 w-5 mr-2 text-emerald-600" />
            Receive Transfer
          </h2>
          <button onClick={onClose} className="text-emerald-400 hover:text-emerald-600 transition-colors">
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="text-center text-sm text-slate-600 mb-4 font-medium">
            Are you sure you want to receive <strong className="text-slate-900 bg-slate-100 px-1 py-0.5 rounded">{transfer.transferNumber}</strong>?
          </div>

          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl text-sm shadow-sm font-medium">
            <strong className="font-bold">Action:</strong> This will add <strong className="font-extrabold text-emerald-900 bg-white px-1 rounded shadow-sm">{transfer.quantity}</strong> units of {transfer.item.name} to the destination location ({transfer.destinationLocation.code}) and mark the transfer as COMPLETED.
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
              className="px-5 py-2.5 text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl font-bold flex items-center transition-all shadow-sm disabled:opacity-50"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Confirm Receipt
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

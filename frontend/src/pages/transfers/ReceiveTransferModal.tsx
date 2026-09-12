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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900 bg-opacity-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="flex justify-between items-center p-6 border-b bg-green-50">
          <h2 className="text-xl font-bold text-green-900 flex items-center">
            <PackageCheck className="h-5 w-5 mr-2" />
            Receive Transfer
          </h2>
          <button onClick={onClose} className="text-green-400 hover:text-green-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="text-center text-sm text-gray-600 mb-4">
            Are you sure you want to receive <strong>{transfer.transferNumber}</strong>?
          </div>

          <div className="bg-blue-50 border border-blue-200 text-blue-800 p-4 rounded-lg text-sm">
            <strong>Action:</strong> This will add <strong>{transfer.quantity}</strong> units of {transfer.item.name} to the destination location ({transfer.destinationLocation.code}) and mark the transfer as COMPLETED.
          </div>

          {error && (
            <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm border border-red-200 text-center">
              {error}
            </div>
          )}

          <div className="pt-2 flex justify-end space-x-3">
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
              className="px-4 py-2 text-white bg-green-600 hover:bg-green-700 rounded-lg font-medium flex items-center transition-colors disabled:opacity-50"
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

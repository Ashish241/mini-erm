import { X } from 'lucide-react';
import type { TransferRecord } from '../../types/transfer';

interface Props {
  transfer: TransferRecord | null;
  onClose: () => void;
}

export default function TransferDetailsModal({ transfer, onClose }: Props) {
  if (!transfer) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900 bg-opacity-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden">
        <div className="flex justify-between items-center p-6 border-b bg-gray-50">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Transfer Details</h2>
            <p className="text-sm text-gray-500 mt-1">{transfer.transferNumber}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {transfer.status === 'DISPATCHED' && (
            <div className="bg-blue-50 border border-blue-200 text-blue-800 p-4 rounded-lg text-sm">
              <strong>Note:</strong> Source stock has been deducted. Destination stock will be added only after this transfer is formally received.
            </div>
          )}

          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Status</p>
                <p className="font-bold text-gray-900 mt-1">{transfer.status}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Quantity</p>
                <p className="font-bold text-gray-900 mt-1">{transfer.quantity}</p>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-3">
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-1">Item</p>
              <p className="font-medium text-gray-900">{transfer.item.name}</p>
              <p className="text-xs text-gray-500">SKU: {transfer.item.sku}</p>
            </div>

            <div className="border-t border-gray-200 pt-3 grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-1">From</p>
                <p className="font-medium text-gray-900">{transfer.sourceLocation.name}</p>
                <p className="text-xs text-gray-500">{transfer.sourceLocation.code}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-1">To</p>
                <p className="font-medium text-gray-900">{transfer.destinationLocation.name}</p>
                <p className="text-xs text-gray-500">{transfer.destinationLocation.code}</p>
              </div>
            </div>
          </div>
          
          <div className="text-xs text-gray-500 flex justify-between">
            <span>Created: {new Date(transfer.createdAt).toLocaleString()}</span>
            <span>Updated: {new Date(transfer.updatedAt).toLocaleString()}</span>
          </div>
        </div>
        
        <div className="p-4 border-t bg-gray-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

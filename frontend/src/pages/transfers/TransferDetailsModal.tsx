import { X } from 'lucide-react';
import type { TransferRecord } from '../../types/transfer';

interface Props {
  transfer: TransferRecord | null;
  onClose: () => void;
}

export default function TransferDetailsModal({ transfer, onClose }: Props) {
  if (!transfer) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100">
        <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-slate-50/50">
          <div>
            <h2 className="text-xl font-extrabold text-slate-900">Transfer Details</h2>
            <p className="text-sm text-slate-500 mt-1 font-medium"><span className="font-mono bg-white px-1.5 py-0.5 rounded border border-slate-200">{transfer.transferNumber}</span></p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {transfer.status === 'DISPATCHED' && (
            <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-xl text-sm shadow-sm font-medium">
              <strong className="font-bold">Note:</strong> Source stock has been deducted. Destination stock will be added only after this transfer is formally received.
            </div>
          )}

          <div className="bg-slate-50/50 rounded-xl p-5 border border-slate-200 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Status</p>
                <p className="font-bold text-slate-900 mt-1">{transfer.status}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Quantity</p>
                <p className="text-2xl font-extrabold text-slate-900 mt-1">{transfer.quantity}</p>
              </div>
            </div>

            <div className="border-t border-slate-200 pt-4">
              <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Item</p>
              <p className="font-bold text-slate-900">{transfer.item.name}</p>
              <p className="text-xs text-slate-500 mt-1"><span className="font-mono bg-white px-1 py-0.5 rounded border border-slate-100">SKU: {transfer.item.sku}</span></p>
            </div>

            <div className="border-t border-slate-200 pt-4 grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">From</p>
                <p className="font-bold text-slate-900">{transfer.sourceLocation.name}</p>
                <p className="text-xs text-slate-500 mt-1 font-mono">{transfer.sourceLocation.code}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">To</p>
                <p className="font-bold text-slate-900">{transfer.destinationLocation.name}</p>
                <p className="text-xs text-slate-500 mt-1 font-mono">{transfer.destinationLocation.code}</p>
              </div>
            </div>
          </div>
          
          <div className="text-xs text-slate-500 flex justify-between font-medium">
            <span>Created: {new Date(transfer.createdAt).toLocaleString()}</span>
            <span>Updated: {new Date(transfer.updatedAt).toLocaleString()}</span>
          </div>
        </div>
        
        <div className="p-5 border-t border-slate-100 bg-slate-50/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900 rounded-xl font-bold transition-all shadow-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { fetchInventoryTransactions } from '../../lib/api';
import type { InventoryTransaction } from '../../types/inventory';

interface Props {
  inventoryId: string | null;
  onClose: () => void;
}

export default function TransactionHistoryModal({ inventoryId, onClose }: Props) {
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (inventoryId) {
      setIsLoading(true);
      setError('');
      fetchInventoryTransactions(inventoryId)
        .then(setTransactions)
        .catch(() => setError('Failed to load transaction history.'))
        .finally(() => setIsLoading(false));
    } else {
      setTransactions([]);
    }
  }, [inventoryId]);

  if (!inventoryId) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl flex flex-col max-h-[90vh] border border-slate-100">
        <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-slate-50/50 flex-shrink-0">
          <h2 className="text-xl font-extrabold text-slate-900">Transaction History</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 bg-white">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-500">
              <Loader2 className="h-8 w-8 animate-spin mb-4 text-brand-500" />
              <p className="font-medium">Loading history...</p>
            </div>
          ) : error ? (
            <div className="bg-red-50 text-red-600 p-4 rounded-xl text-center font-medium border border-red-100">
              {error}
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-16 text-slate-500 font-medium">
              No transactions found for this record.
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-slate-200 shadow-sm">
              <table className="min-w-full divide-y divide-slate-100">
                <thead className="bg-slate-50/80">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Type</th>
                    <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Quantity</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Reference</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">User ID</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-100">
                  {transactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 font-medium">
                        {new Date(tx.createdAt).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`px-2.5 py-1 inline-flex text-xs leading-5 font-bold rounded-md border ${
                          ['INBOUND', 'RELEASE'].includes(tx.type) ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                          ['OUTBOUND', 'RESERVATION'].includes(tx.type) ? 'bg-red-50 text-red-700 border-red-200' :
                          'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                          {tx.type}
                        </span>
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-extrabold ${tx.quantity > 0 ? 'text-emerald-600' : tx.quantity < 0 ? 'text-red-600' : 'text-slate-600'}`}>
                        {tx.quantity > 0 ? `+${tx.quantity}` : tx.quantity}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                        {tx.referenceType} <br/>
                        <span className="text-xs text-slate-400 font-mono bg-slate-50 px-1 py-0.5 rounded border border-slate-100" title={tx.referenceId}>
                          {tx.referenceId !== 'N/A' ? tx.referenceId.slice(0, 8) + '...' : 'N/A'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 font-mono text-xs">
                        {tx.createdById.slice(0, 8)}...
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        
        <div className="p-5 border-t border-slate-100 bg-slate-50/50 flex justify-end flex-shrink-0">
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

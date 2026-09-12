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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900 bg-opacity-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center p-6 border-b flex-shrink-0">
          <h2 className="text-xl font-bold text-gray-900">Transaction History</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <Loader2 className="h-8 w-8 animate-spin mb-4 text-yellow-600" />
              <p>Loading history...</p>
            </div>
          ) : error ? (
            <div className="bg-red-50 text-red-600 p-4 rounded-lg text-center">
              {error}
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              No transactions found for this record.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reference</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User ID</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {transactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(tx.createdAt).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          ['INBOUND', 'RELEASE'].includes(tx.type) ? 'bg-green-100 text-green-800' :
                          ['OUTBOUND', 'RESERVATION'].includes(tx.type) ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {tx.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-gray-900">
                        {tx.quantity > 0 ? `+${tx.quantity}` : tx.quantity}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {tx.referenceType} <br/>
                        <span className="text-xs text-gray-400" title={tx.referenceId}>
                          {tx.referenceId !== 'N/A' ? tx.referenceId.slice(0, 8) + '...' : 'N/A'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono text-xs">
                        {tx.createdById.slice(0, 8)}...
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        
        <div className="p-4 border-t bg-gray-50 flex justify-end flex-shrink-0">
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

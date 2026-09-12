import { useState } from 'react';
import { X, Loader2, AlertTriangle, CheckCircle2, Lock, XCircle, ShoppingCart } from 'lucide-react';
import { reserveOrder, completeOrder, cancelOrder } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import type { CustomerOrderRecord } from '../../types/order';

interface Props {
  order: CustomerOrderRecord | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function OrderDetailsModal({ order, onClose, onSuccess }: Props) {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  
  // States to track which confirmation mode we are in
  const [confirmMode, setConfirmMode] = useState<'RESERVE' | 'COMPLETE' | 'CANCEL' | null>(null);

  if (!order) return null;

  // RBAC checks matching backend:
  // SALES or ADMIN can reserve/complete/cancel.
  // OPERATIONS cannot perform these mutations.
  const canMutate = user?.role === 'SALES' || user?.role === 'ADMIN';

  const handleAction = async (actionFn: (id: string) => Promise<any>, actionName: string) => {
    setError('');
    setSuccessMsg('');
    setIsSubmitting(true);

    try {
      await actionFn(order.id);
      setSuccessMsg(`Order successfully ${actionName.toLowerCase()}.`);
      onSuccess();
      
      // Keep modal open so they can see the success message and new state, but exit confirm mode
      setConfirmMode(null);
    } catch (err: any) {
      if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else {
        setError(`Failed to ${actionName.toLowerCase()} order.`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalQuantity = order.items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900 bg-opacity-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center p-6 border-b bg-gray-50">
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center">
              <ShoppingCart className="h-5 w-5 mr-2 text-blue-600" />
              Order Details
            </h2>
            <p className="text-sm text-gray-500 mt-1">{order.orderNumber}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm border border-red-200">
              {error}
            </div>
          )}
          {successMsg && (
            <div className="p-3 bg-green-50 text-green-700 rounded-lg text-sm border border-green-200 flex items-center">
              <CheckCircle2 className="h-4 w-4 mr-2" />
              {successMsg}
            </div>
          )}

          {/* Action Confirmations */}
          {confirmMode === 'RESERVE' && (
            <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
              <h3 className="font-bold text-blue-900 flex items-center mb-2">
                <Lock className="h-5 w-5 mr-2" />
                Confirm Stock Reservation
              </h3>
              <p className="text-sm text-blue-800 mb-4">
                Reservation checks and locks inventory in a database transaction. If stock is insufficient for ANY line item, the entire reservation will fail (all-or-nothing).
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={() => setConfirmMode(null)}
                  className="px-3 py-1.5 text-blue-700 bg-blue-100 hover:bg-blue-200 rounded text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleAction(reserveOrder, 'RESERVED')}
                  disabled={isSubmitting}
                  className="px-3 py-1.5 text-white bg-blue-600 hover:bg-blue-700 rounded text-sm font-medium flex items-center transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                  Reserve Stock Now
                </button>
              </div>
            </div>
          )}

          {confirmMode === 'COMPLETE' && (
            <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
              <h3 className="font-bold text-green-900 flex items-center mb-2">
                <CheckCircle2 className="h-5 w-5 mr-2" />
                Confirm Completion
              </h3>
              <p className="text-sm text-green-800 mb-4">
                Completing the order will finalize the stock reservation. The physical stock will be permanently reduced. This action cannot be undone.
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={() => setConfirmMode(null)}
                  className="px-3 py-1.5 text-green-700 bg-green-100 hover:bg-green-200 rounded text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleAction(completeOrder, 'COMPLETED')}
                  disabled={isSubmitting}
                  className="px-3 py-1.5 text-white bg-green-600 hover:bg-green-700 rounded text-sm font-medium flex items-center transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                  Complete Order Now
                </button>
              </div>
            </div>
          )}

          {confirmMode === 'CANCEL' && (
            <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
              <h3 className="font-bold text-red-900 flex items-center mb-2">
                <XCircle className="h-5 w-5 mr-2" />
                Confirm Cancellation
              </h3>
              <p className="text-sm text-red-800 mb-4">
                Cancelling the order will immediately release any reserved stock back into available inventory.
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={() => setConfirmMode(null)}
                  className="px-3 py-1.5 text-red-700 bg-red-100 hover:bg-red-200 rounded text-sm font-medium transition-colors"
                >
                  No, Keep Order
                </button>
                <button
                  onClick={() => handleAction(cancelOrder, 'CANCELLED')}
                  disabled={isSubmitting}
                  className="px-3 py-1.5 text-white bg-red-600 hover:bg-red-700 rounded text-sm font-medium flex items-center transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                  Cancel Order
                </button>
              </div>
            </div>
          )}

          {/* Header Info */}
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 flex flex-col md:flex-row gap-6">
            <div className="flex-1">
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Created By / Sales Rep</p>
              <p className="font-medium text-gray-900 mt-1">{order.createdBy.name}</p>
              <p className="text-xs text-gray-500">{order.createdBy.email}</p>
            </div>
            <div className="flex-1">
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Status</p>
              <p className="font-bold text-gray-900 mt-1">{order.status}</p>
            </div>
            <div className="flex-1">
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Total Quantity</p>
              <p className="font-bold text-gray-900 mt-1">{totalQuantity} units</p>
            </div>
            <div className="flex-1">
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Created At</p>
              <p className="font-medium text-gray-900 mt-1">{new Date(order.createdAt).toLocaleString()}</p>
            </div>
          </div>
          
          {/* Items Table */}
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-3">Order Items</h3>
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">Item</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">Location</th>
                    <th className="px-4 py-3 text-right font-medium text-gray-500">Requested</th>
                    <th className="px-4 py-3 text-right font-medium text-gray-500">Reserved</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {order.items.map(item => (
                    <tr key={item.id}>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{item.item.name}</div>
                        <div className="text-xs text-gray-500">{item.item.sku}</div>
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {item.location.name} ({item.location.code})
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-gray-900">
                        {item.quantity}
                      </td>
                      <td className="px-4 py-3 text-right font-medium">
                        {order.status === 'CREATED' ? (
                          <span className="text-gray-400">0</span>
                        ) : item.reservedQuantity < item.quantity ? (
                          <span className="text-red-600 flex items-center justify-end">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            {item.reservedQuantity}
                          </span>
                        ) : (
                          <span className="text-green-600">{item.reservedQuantity}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          
          {order.status === 'CREATED' && (
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 text-sm text-gray-600">
              <Lock className="h-4 w-4 inline mr-2 text-gray-400" />
              Stock cannot be reserved beyond actual available inventory. The reservation is all-or-nothing.
            </div>
          )}

        </div>
        
        {/* Footer Actions */}
        <div className="p-4 border-t bg-gray-50 flex justify-between items-center">
          <div className="space-x-3">
            {canMutate && order.status === 'CREATED' && !confirmMode && (
              <button
                onClick={() => setConfirmMode('RESERVE')}
                className="px-4 py-2 text-white bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors"
              >
                Reserve Stock
              </button>
            )}
            {canMutate && order.status === 'RESERVED' && !confirmMode && (
              <button
                onClick={() => setConfirmMode('COMPLETE')}
                className="px-4 py-2 text-white bg-green-600 hover:bg-green-700 rounded-lg font-medium transition-colors"
              >
                Complete Order
              </button>
            )}
            {canMutate && (order.status === 'CREATED' || order.status === 'RESERVED') && !confirmMode && (
              <button
                onClick={() => setConfirmMode('CANCEL')}
                className="px-4 py-2 text-red-700 bg-red-100 hover:bg-red-200 rounded-lg font-medium transition-colors"
              >
                Cancel Order
              </button>
            )}
          </div>

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

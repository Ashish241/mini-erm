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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh] border border-slate-100">
        <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-slate-50/50">
          <div>
            <h2 className="text-xl font-extrabold text-slate-900 flex items-center">
              <ShoppingCart className="h-5 w-5 mr-2 text-brand-600" />
              Order Details
            </h2>
            <p className="text-sm text-slate-500 mt-1 font-medium"><span className="font-mono bg-white px-1.5 py-0.5 rounded border border-slate-200">{order.orderNumber}</span></p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
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
            <div className="bg-brand-50 border border-brand-200 p-5 rounded-2xl shadow-sm">
              <h3 className="font-extrabold text-brand-900 flex items-center mb-2">
                <Lock className="h-5 w-5 mr-2 text-brand-600" />
                Confirm Stock Reservation
              </h3>
              <p className="text-sm text-brand-800 mb-5 font-medium">
                Reservation checks and locks inventory in a database transaction. If stock is insufficient for ANY line item, the entire reservation will fail (all-or-nothing).
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={() => setConfirmMode(null)}
                  className="px-4 py-2 text-brand-800 bg-brand-100 hover:bg-brand-200 rounded-xl text-sm font-bold transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleAction(reserveOrder, 'RESERVED')}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-slate-900 bg-brand-500 hover:bg-brand-400 rounded-xl text-sm font-bold flex items-center transition-all shadow-sm disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                  Reserve Stock Now
                </button>
              </div>
            </div>
          )}

          {confirmMode === 'COMPLETE' && (
            <div className="bg-emerald-50 border border-emerald-200 p-5 rounded-2xl shadow-sm">
              <h3 className="font-extrabold text-emerald-900 flex items-center mb-2">
                <CheckCircle2 className="h-5 w-5 mr-2 text-emerald-600" />
                Confirm Completion
              </h3>
              <p className="text-sm text-emerald-800 mb-5 font-medium">
                Completing the order will finalize the stock reservation. The physical stock will be permanently reduced. This action cannot be undone.
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={() => setConfirmMode(null)}
                  className="px-4 py-2 text-emerald-800 bg-emerald-100 hover:bg-emerald-200 rounded-xl text-sm font-bold transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleAction(completeOrder, 'COMPLETED')}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl text-sm font-bold flex items-center transition-all shadow-sm disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                  Complete Order Now
                </button>
              </div>
            </div>
          )}

          {confirmMode === 'CANCEL' && (
            <div className="bg-red-50 border border-red-200 p-5 rounded-2xl shadow-sm">
              <h3 className="font-extrabold text-red-900 flex items-center mb-2">
                <XCircle className="h-5 w-5 mr-2 text-red-600" />
                Confirm Cancellation
              </h3>
              <p className="text-sm text-red-800 mb-5 font-medium">
                Cancelling the order will immediately release any reserved stock back into available inventory.
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={() => setConfirmMode(null)}
                  className="px-4 py-2 text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 hover:text-slate-900 rounded-xl text-sm font-bold transition-all shadow-sm"
                >
                  No, Keep Order
                </button>
                <button
                  onClick={() => handleAction(cancelOrder, 'CANCELLED')}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-white bg-red-600 hover:bg-red-500 rounded-xl text-sm font-bold flex items-center transition-all shadow-sm disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                  Cancel Order
                </button>
              </div>
            </div>
          )}

          {/* Header Info */}
          <div className="bg-slate-50/50 rounded-2xl p-5 border border-slate-200 flex flex-col md:flex-row gap-6 shadow-sm">
            <div className="flex-1">
              <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Created By / Sales Rep</p>
              <p className="font-bold text-slate-900 mt-1">{order.createdBy.name}</p>
              <p className="text-xs text-slate-500 font-medium mt-0.5">{order.createdBy.email}</p>
            </div>
            <div className="flex-1">
              <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Status</p>
              <p className="font-bold text-slate-900 mt-1">{order.status}</p>
            </div>
            <div className="flex-1">
              <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Total Quantity</p>
              <p className="font-extrabold text-slate-900 mt-1">{totalQuantity} units</p>
            </div>
            <div className="flex-1">
              <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Created At</p>
              <p className="font-bold text-slate-900 mt-1">{new Date(order.createdAt).toLocaleString()}</p>
            </div>
          </div>
          
          {/* Items Table */}
          <div>
            <h3 className="text-lg font-extrabold text-slate-900 mb-4">Order Items</h3>
            <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
              <table className="min-w-full divide-y divide-slate-100 text-sm">
                <thead className="bg-slate-50/80">
                  <tr>
                    <th className="px-5 py-4 text-left font-bold text-slate-500 uppercase tracking-wider text-xs">Item</th>
                    <th className="px-5 py-4 text-left font-bold text-slate-500 uppercase tracking-wider text-xs">Location</th>
                    <th className="px-5 py-4 text-right font-bold text-slate-500 uppercase tracking-wider text-xs">Requested</th>
                    <th className="px-5 py-4 text-right font-bold text-slate-500 uppercase tracking-wider text-xs">Reserved</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-100">
                  {order.items.map(item => (
                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-5 py-4">
                        <div className="font-bold text-slate-900">{item.item.name}</div>
                        <div className="text-xs text-slate-500 mt-1"><span className="font-mono bg-slate-50 px-1 py-0.5 rounded border border-slate-100">SKU: {item.item.sku}</span></div>
                      </td>
                      <td className="px-5 py-4 text-slate-700 font-medium">
                        {item.location.name} <span className="text-slate-400 font-mono">({item.location.code})</span>
                      </td>
                      <td className="px-5 py-4 text-right font-extrabold text-slate-900">
                        {item.quantity}
                      </td>
                      <td className="px-5 py-4 text-right font-bold">
                        {order.status === 'CREATED' ? (
                          <span className="text-slate-400">0</span>
                        ) : item.reservedQuantity < item.quantity ? (
                          <span className="text-red-600 flex items-center justify-end">
                            <AlertTriangle className="h-4 w-4 mr-1" />
                            {item.reservedQuantity}
                          </span>
                        ) : (
                          <span className="text-emerald-600">{item.reservedQuantity}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          
          {order.status === 'CREATED' && (
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-sm text-slate-600 font-medium shadow-sm">
              <Lock className="h-4 w-4 inline mr-2 text-slate-400" />
              Stock cannot be reserved beyond actual available inventory. The reservation is all-or-nothing.
            </div>
          )}

        </div>
        
        {/* Footer Actions */}
        <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex justify-between items-center">
          <div className="space-x-3">
            {canMutate && order.status === 'CREATED' && !confirmMode && (
              <button
                onClick={() => setConfirmMode('RESERVE')}
                className="px-5 py-2.5 text-slate-900 bg-brand-500 hover:bg-brand-400 rounded-xl font-bold transition-all shadow-sm"
              >
                Reserve Stock
              </button>
            )}
            {canMutate && order.status === 'RESERVED' && !confirmMode && (
              <button
                onClick={() => setConfirmMode('COMPLETE')}
                className="px-5 py-2.5 text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl font-bold transition-all shadow-sm"
              >
                Complete Order
              </button>
            )}
            {canMutate && (order.status === 'CREATED' || order.status === 'RESERVED') && !confirmMode && (
              <button
                onClick={() => setConfirmMode('CANCEL')}
                className="px-5 py-2.5 text-red-700 bg-red-100 hover:bg-red-200 rounded-xl font-bold transition-all shadow-sm"
              >
                Cancel Order
              </button>
            )}
          </div>

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

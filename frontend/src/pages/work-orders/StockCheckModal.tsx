import { useState, useEffect } from 'react';
import { X, Loader2, CheckCircle2, AlertTriangle, AlertCircle } from 'lucide-react';
import { checkWorkOrderStock } from '../../lib/api';
import type { StockCheckResponse, WorkOrderRecord } from '../../types/workOrder';

interface Props {
  workOrder: WorkOrderRecord | null;
  onClose: () => void;
}

export default function StockCheckModal({ workOrder, onClose }: Props) {
  const [stock, setStock] = useState<StockCheckResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (workOrder) {
      setIsLoading(true);
      setError('');
      checkWorkOrderStock(workOrder.id)
        .then(setStock)
        .catch(() => setError('Failed to perform stock check.'))
        .finally(() => setIsLoading(false));
    } else {
      setStock(null);
      setError('');
    }
  }, [workOrder]);

  if (!workOrder) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100">
        <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-slate-50/50">
          <div>
            <h2 className="text-xl font-extrabold text-slate-900">Material Stock Check</h2>
            <p className="text-sm text-slate-500 mt-1 font-medium">WO: <span className="font-mono bg-white px-1.5 py-0.5 rounded border border-slate-200">{workOrder.workOrderNumber}</span></p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-500">
              <Loader2 className="h-8 w-8 animate-spin mb-4 text-brand-500" />
              <p className="font-medium">Checking inventory levels...</p>
            </div>
          ) : error ? (
            <div className="bg-red-50 text-red-600 p-4 rounded-xl text-center flex items-center justify-center font-medium border border-red-100">
              <AlertCircle className="h-5 w-5 mr-2" />
              {error}
            </div>
          ) : stock ? (
            <div className="space-y-6">
              {/* Status Header */}
              {stock.hasSufficientStock ? (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 flex items-start shadow-sm">
                  <CheckCircle2 className="h-6 w-6 text-emerald-600 mr-3 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-extrabold text-emerald-800">Sufficient Materials</h3>
                    <p className="text-sm text-emerald-700 mt-1 font-medium">
                      There is enough available stock at this location to begin production.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="bg-red-50 border border-red-200 rounded-xl p-5 flex items-start shadow-sm">
                  <AlertTriangle className="h-6 w-6 text-red-600 mr-3 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-extrabold text-red-800">Insufficient Materials</h3>
                    <p className="text-sm text-red-700 mt-1 font-medium">
                      Shortage of <strong className="bg-white px-1 py-0.5 rounded shadow-sm">{stock.shortageQuantity}</strong> units detected. 
                      You must transfer or receive more inventory before beginning this work order.
                    </p>
                  </div>
                </div>
              )}

              {/* Details */}
              <div className="bg-slate-50/50 rounded-xl p-5 border border-slate-200 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Item</p>
                    <p className="font-bold text-slate-900 mt-1">{stock.item.name}</p>
                    <p className="text-xs text-slate-500 font-mono bg-white inline-block px-1 rounded border border-slate-100 mt-1">{stock.item.sku}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Location</p>
                    <p className="font-bold text-slate-900 mt-1">{stock.location.name}</p>
                    <p className="text-xs text-slate-500 font-mono bg-white inline-block px-1 rounded border border-slate-100 mt-1">{stock.location.code}</p>
                  </div>
                </div>

                <div className="border-t border-slate-200 pt-4 mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white p-3 rounded-lg border border-slate-100 shadow-sm">
                      <p className="text-sm font-medium text-slate-600">Required Quantity</p>
                      <p className="text-2xl font-extrabold text-slate-900 mt-1">{stock.requiredQuantity}</p>
                    </div>
                    <div className={`p-3 rounded-lg border shadow-sm ${stock.hasSufficientStock ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'}`}>
                      <p className={`text-sm font-medium ${stock.hasSufficientStock ? 'text-emerald-700' : 'text-red-700'}`}>Available Quantity</p>
                      <p className={`text-2xl font-extrabold mt-1 ${stock.hasSufficientStock ? 'text-emerald-700' : 'text-red-700'}`}>
                        {stock.availableQuantity}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="text-xs text-slate-500 grid grid-cols-2 gap-4 pt-2 font-medium">
                  <p>Physical Stock: {stock.physicalQuantity}</p>
                  <p>Reserved Stock: {stock.reservedQuantity}</p>
                </div>
              </div>
            </div>
          ) : null}
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

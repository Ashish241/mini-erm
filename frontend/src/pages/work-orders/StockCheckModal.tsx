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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900 bg-opacity-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden">
        <div className="flex justify-between items-center p-6 border-b bg-gray-50">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Material Stock Check</h2>
            <p className="text-sm text-gray-500 mt-1">WO: {workOrder.workOrderNumber}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <Loader2 className="h-8 w-8 animate-spin mb-4 text-blue-600" />
              <p>Checking inventory levels...</p>
            </div>
          ) : error ? (
            <div className="bg-red-50 text-red-600 p-4 rounded-lg text-center flex items-center justify-center">
              <AlertCircle className="h-5 w-5 mr-2" />
              {error}
            </div>
          ) : stock ? (
            <div className="space-y-6">
              {/* Status Header */}
              {stock.hasSufficientStock ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start">
                  <CheckCircle2 className="h-6 w-6 text-green-600 mr-3 mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="font-bold text-green-800">Sufficient Materials</h3>
                    <p className="text-sm text-green-700 mt-1">
                      There is enough available stock at this location to begin production.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start">
                  <AlertTriangle className="h-6 w-6 text-red-600 mr-3 mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="font-bold text-red-800">Insufficient Materials</h3>
                    <p className="text-sm text-red-700 mt-1">
                      Shortage of <strong>{stock.shortageQuantity}</strong> units detected. 
                      You must transfer or receive more inventory before beginning this work order.
                    </p>
                  </div>
                </div>
              )}

              {/* Details */}
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Item</p>
                    <p className="font-medium text-gray-900 mt-1">{stock.item.name}</p>
                    <p className="text-xs text-gray-500">{stock.item.sku}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Location</p>
                    <p className="font-medium text-gray-900 mt-1">{stock.location.name}</p>
                    <p className="text-xs text-gray-500">{stock.location.code}</p>
                  </div>
                </div>

                <div className="border-t border-gray-200 pt-3 mt-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Required Quantity:</p>
                      <p className="text-xl font-bold text-gray-900">{stock.requiredQuantity}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Available Quantity:</p>
                      <p className={`text-xl font-bold ${stock.hasSufficientStock ? 'text-green-600' : 'text-red-600'}`}>
                        {stock.availableQuantity}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="text-xs text-gray-500 grid grid-cols-2 gap-4 pt-2">
                  <p>Physical Stock: {stock.physicalQuantity}</p>
                  <p>Reserved Stock: {stock.reservedQuantity}</p>
                </div>
              </div>
            </div>
          ) : null}
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

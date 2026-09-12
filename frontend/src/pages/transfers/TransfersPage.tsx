import { useState, useEffect, useCallback } from 'react';
import { ArrowRightLeft, Plus, RefreshCw, AlertCircle, Loader2 } from 'lucide-react';
import { fetchTransfers } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import type { TransferRecord, TransferStatus } from '../../types/transfer';
import CreateTransferModal from './CreateTransferModal';
import TransferDetailsModal from './TransferDetailsModal';
import DispatchTransferModal from './DispatchTransferModal';
import ReceiveTransferModal from './ReceiveTransferModal';

export default function TransfersPage() {
  const { user } = useAuth();
  const [transfers, setTransfers] = useState<TransferRecord[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [detailsRecord, setDetailsRecord] = useState<TransferRecord | null>(null);
  const [dispatchRecord, setDispatchRecord] = useState<TransferRecord | null>(null);
  const [receiveRecord, setReceiveRecord] = useState<TransferRecord | null>(null);

  const canMutate = user?.role === 'ADMIN' || user?.role === 'OPERATIONS';

  if (user?.role === 'SALES') {
    return (
      <div className="p-6 bg-red-50 text-red-700 rounded-lg">
        You do not have permission to view Internal Transfers.
      </div>
    );
  }

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const params: any = {};
      if (statusFilter) params.status = statusFilter;

      let data = await fetchTransfers(params);
      
      if (search) {
        const s = search.toLowerCase();
        data = data.filter((t: TransferRecord) => 
          t.transferNumber.toLowerCase().includes(s) || 
          t.item.name.toLowerCase().includes(s)
        );
      }
      
      setTransfers(data);
    } catch (err) {
      setError('Failed to load transfers.');
    } finally {
      setIsLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Derived metrics
  const totalTransfers = transfers.length;
  const requestedCount = transfers.filter(t => t.status === 'REQUESTED').length;
  const dispatchedCount = transfers.filter(t => t.status === 'DISPATCHED').length;
  const receivedCount = transfers.filter(t => t.status === 'RECEIVED').length;

  const handleResetFilters = () => {
    setSearch('');
    setStatusFilter('');
  };

  const getStatusBadge = (status: TransferStatus) => {
    switch (status) {
      case 'REQUESTED': return <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded-full text-xs font-semibold">Requested</span>;
      case 'DISPATCHED': return <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-semibold">Dispatched</span>;
      case 'RECEIVED': return <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-semibold">Received</span>;
      default: return null;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <ArrowRightLeft className="h-6 w-6 mr-2 text-blue-600" />
            Internal Transfers
          </h1>
          <p className="text-gray-500 text-sm mt-1">Move inventory across warehouse locations.</p>
        </div>
        
        <div className="flex space-x-3">
          <button
            onClick={loadData}
            className="px-4 py-2 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg font-medium flex items-center transition-colors"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          
          {canMutate && (
            <button
              onClick={() => setIsCreateOpen(true)}
              className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg font-medium flex items-center transition-colors shadow-sm"
            >
              <Plus className="h-4 w-4 mr-2" />
              Request Transfer
            </button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <p className="text-sm font-medium text-gray-500">Total Transfers</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{totalTransfers}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <p className="text-sm font-medium text-gray-500">Requested</p>
          <p className="text-2xl font-bold text-gray-600 mt-1">{requestedCount}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <p className="text-sm font-medium text-gray-500">Dispatched</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">{dispatchedCount}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <p className="text-sm font-medium text-gray-500">Received</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{receivedCount}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-4">
        <input
          type="text"
          placeholder="Search by TRF# or Item..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 border border-gray-300 rounded-lg p-2 text-sm focus:ring-blue-500 focus:border-blue-500"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-gray-300 rounded-lg p-2 text-sm focus:ring-blue-500 focus:border-blue-500 w-full md:w-48"
        >
          <option value="">All Statuses</option>
          <option value="REQUESTED">Requested</option>
          <option value="DISPATCHED">Dispatched</option>
          <option value="RECEIVED">Received</option>
        </select>
        <button
          onClick={handleResetFilters}
          className="px-4 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors"
        >
          Clear
        </button>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center">
          <AlertCircle className="h-5 w-5 mr-2" />
          {error}
        </div>
      )}

      {/* Data Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">TRF Number</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">From Source</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">To Destination</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Qty</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading && transfers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600 mb-2" />
                    Loading transfers...
                  </td>
                </tr>
              ) : transfers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    No transfers found.
                  </td>
                </tr>
              ) : (
                transfers.map((trf) => (
                  <tr key={trf.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-bold text-gray-900">{trf.transferNumber}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{new Date(trf.createdAt).toLocaleDateString()}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{trf.item.name}</div>
                      <div className="text-xs text-gray-500">SKU: {trf.item.sku}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{trf.sourceLocation.code}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{trf.destinationLocation.code}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-medium">
                      {trf.quantity}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      {getStatusBadge(trf.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-3">
                      <button
                        onClick={() => setDetailsRecord(trf)}
                        className="text-gray-600 hover:text-gray-900"
                      >
                        Details
                      </button>
                      
                      {canMutate && trf.status === 'REQUESTED' && (
                        <button
                          onClick={() => setDispatchRecord(trf)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          Dispatch
                        </button>
                      )}
                      
                      {canMutate && trf.status === 'DISPATCHED' && (
                        <button
                          onClick={() => setReceiveRecord(trf)}
                          className="text-green-600 hover:text-green-900"
                        >
                          Receive
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <CreateTransferModal 
        isOpen={isCreateOpen} 
        onClose={() => setIsCreateOpen(false)} 
        onSuccess={loadData} 
      />
      
      <TransferDetailsModal 
        transfer={detailsRecord} 
        onClose={() => setDetailsRecord(null)} 
      />

      <DispatchTransferModal 
        transfer={dispatchRecord} 
        onClose={() => setDispatchRecord(null)} 
        onSuccess={loadData} 
      />

      <ReceiveTransferModal 
        transfer={receiveRecord} 
        onClose={() => setReceiveRecord(null)} 
        onSuccess={loadData} 
      />
    </div>
  );
}

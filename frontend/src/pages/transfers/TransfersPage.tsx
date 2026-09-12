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
      case 'REQUESTED': return <span className="bg-slate-100 text-slate-800 border border-slate-200 px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider">Requested</span>;
      case 'DISPATCHED': return <span className="bg-brand-50 text-brand-800 border border-brand-200 px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider">Dispatched</span>;
      case 'RECEIVED': return <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider">Received</span>;
      default: return null;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 flex items-center tracking-tight">
            <ArrowRightLeft className="h-7 w-7 mr-3 text-brand-500" />
            Internal Transfers
          </h1>
          <p className="text-gray-500 text-sm mt-2 font-medium">Move inventory across warehouse locations.</p>
        </div>
        
        <div className="flex space-x-3">
          <button
            onClick={loadData}
            className="px-4 py-2.5 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-xl font-medium flex items-center transition-all shadow-sm"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          
          {canMutate && (
            <button
              onClick={() => setIsCreateOpen(true)}
              className="px-4 py-2.5 bg-brand-500 text-slate-900 hover:bg-brand-400 rounded-xl font-bold flex items-center transition-all shadow-sm"
            >
              <Plus className="h-4 w-4 mr-2" />
              Request Transfer
            </button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Total Transfers</p>
          <p className="text-3xl font-extrabold text-gray-900 mt-2">{totalTransfers}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Requested</p>
          <p className="text-3xl font-extrabold text-indigo-600 mt-2">{requestedCount}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Dispatched</p>
          <p className="text-3xl font-extrabold text-brand-600 mt-2">{dispatchedCount}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Received</p>
          <p className="text-3xl font-extrabold text-emerald-600 mt-2">{receivedCount}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-4">
        <input
          type="text"
          placeholder="Search by TRF# or Item..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 border border-gray-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 shadow-sm transition-all"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-gray-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 shadow-sm transition-all w-full md:w-48"
        >
          <option value="">All Statuses</option>
          <option value="REQUESTED">Requested</option>
          <option value="DISPATCHED">Dispatched</option>
          <option value="RECEIVED">Received</option>
        </select>
        <button
          onClick={handleResetFilters}
          className="px-6 py-3 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl text-sm font-bold transition-colors shadow-sm"
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
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-gray-50/50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">TRF Number</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Item</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Route</th>
                <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Qty</th>
                <th className="px-6 py-4 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {isLoading && transfers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center text-gray-500">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-brand-500 mb-4" />
                    <p className="font-medium text-gray-600">Loading transfers...</p>
                  </td>
                </tr>
              ) : transfers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center text-gray-500">
                    <ArrowRightLeft className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                    <p className="font-medium text-gray-600">No transfers found.</p>
                    <p className="text-sm mt-1 text-gray-400">Try adjusting your filters or request a new transfer.</p>
                  </td>
                </tr>
              ) : (
                transfers.map((trf) => (
                  <tr key={trf.id} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-bold text-gray-900">{trf.transferNumber}</div>
                      <div className="text-xs text-gray-500 mt-1">{new Date(trf.createdAt).toLocaleDateString()}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{trf.item.name}</div>
                      <div className="text-xs text-gray-500 mt-1 font-mono">SKU: {trf.item.sku}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2 text-sm font-medium text-gray-700 bg-gray-50 inline-flex px-3 py-1.5 rounded-lg border border-gray-100">
                        <span>{trf.sourceLocation.code}</span>
                        <ArrowRightLeft className="h-4 w-4 text-brand-400 mx-1" />
                        <span>{trf.destinationLocation.code}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-extrabold">
                      {trf.quantity}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      {getStatusBadge(trf.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                      <button
                        onClick={() => setDetailsRecord(trf)}
                        className="text-gray-500 hover:text-brand-600 bg-white border border-gray-200 hover:border-brand-200 px-3 py-1.5 rounded-lg transition-all shadow-sm"
                      >
                        Details
                      </button>
                      
                      {canMutate && trf.status === 'REQUESTED' && (
                        <button
                          onClick={() => setDispatchRecord(trf)}
                          className="text-slate-900 bg-brand-400 hover:bg-brand-500 px-3 py-1.5 rounded-lg transition-all shadow-sm font-bold"
                        >
                          Dispatch
                        </button>
                      )}
                      
                      {canMutate && trf.status === 'DISPATCHED' && (
                        <button
                          onClick={() => setReceiveRecord(trf)}
                          className="text-emerald-900 bg-emerald-400 hover:bg-emerald-500 px-3 py-1.5 rounded-lg transition-all shadow-sm font-bold"
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

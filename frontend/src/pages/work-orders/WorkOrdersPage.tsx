import { useState, useEffect, useCallback } from 'react';
import { Wrench, Plus, RefreshCw, AlertCircle, Loader2 } from 'lucide-react';
import { fetchWorkOrders } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import type { WorkOrderRecord, WorkOrderStatus } from '../../types/workOrder';
import CreateWorkOrderModal from './CreateWorkOrderModal';
import UpdateStatusModal from './UpdateStatusModal';
import StockCheckModal from './StockCheckModal';

export default function WorkOrdersPage() {
  const { user } = useAuth();
  const [workOrders, setWorkOrders] = useState<WorkOrderRecord[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [statusRecord, setStatusRecord] = useState<WorkOrderRecord | null>(null);
  const [stockCheckRecord, setStockCheckRecord] = useState<WorkOrderRecord | null>(null);

  const canCreate = user?.role === 'ADMIN';
  const canEdit = user?.role === 'ADMIN' || user?.role === 'OPERATIONS';

  // If user is SALES, they shouldn't be here, but we'll show an error just in case layout fails to block them
  if (user?.role === 'SALES') {
    return (
      <div className="p-6 bg-red-50 text-red-700 rounded-lg">
        You do not have permission to view Work Orders.
      </div>
    );
  }

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const params: any = {};
      if (statusFilter) params.status = statusFilter;

      let data = await fetchWorkOrders(params);
      
      // Client-side search for Work Order Number since backend list endpoint doesn't support full-text search directly
      if (search) {
        const s = search.toLowerCase();
        data = data.filter((w: WorkOrderRecord) => 
          w.workOrderNumber.toLowerCase().includes(s) || 
          w.item.name.toLowerCase().includes(s)
        );
      }
      
      setWorkOrders(data);
    } catch (err) {
      setError('Failed to load work orders.');
    } finally {
      setIsLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Derived metrics
  const totalOrders = workOrders.length;
  const assignedOrders = workOrders.filter(w => w.status === 'ASSIGNED').length;
  const inProgressOrders = workOrders.filter(w => w.status === 'IN_PROGRESS').length;
  const completedOrders = workOrders.filter(w => w.status === 'COMPLETED').length;

  const handleResetFilters = () => {
    setSearch('');
    setStatusFilter('');
  };

  const getStatusBadge = (status: WorkOrderStatus) => {
    switch (status) {
      case 'ASSIGNED': return <span className="bg-slate-100 text-slate-800 border border-slate-200 px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider">Assigned</span>;
      case 'IN_PROGRESS': return <span className="bg-brand-50 text-brand-800 border border-brand-200 px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider">In Progress</span>;
      case 'COMPLETED': return <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider">Completed</span>;
      default: return null;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 flex items-center tracking-tight">
            <Wrench className="h-7 w-7 mr-3 text-brand-500" />
            Work Orders
          </h1>
          <p className="text-gray-500 text-sm mt-2 font-medium">Manage manufacturing and production tasks.</p>
        </div>
        
        <div className="flex space-x-3">
          <button
            onClick={loadData}
            className="px-4 py-2.5 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-xl font-medium flex items-center transition-all shadow-sm"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          
          {canCreate && (
            <button
              onClick={() => setIsCreateOpen(true)}
              className="px-4 py-2.5 bg-brand-500 text-slate-900 hover:bg-brand-400 rounded-xl font-bold flex items-center transition-all shadow-sm"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Work Order
            </button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Total Work Orders</p>
          <p className="text-3xl font-extrabold text-gray-900 mt-2">{totalOrders}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Assigned</p>
          <p className="text-3xl font-extrabold text-indigo-600 mt-2">{assignedOrders}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider">In Progress</p>
          <p className="text-3xl font-extrabold text-brand-600 mt-2">{inProgressOrders}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Completed</p>
          <p className="text-3xl font-extrabold text-emerald-600 mt-2">{completedOrders}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-4">
        <input
          type="text"
          placeholder="Search by WO# or Item..."
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
          <option value="ASSIGNED">Assigned</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="COMPLETED">Completed</option>
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
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">WO Number</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Item</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Location</th>
                <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Qty Req</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Assigned To</th>
                <th className="px-6 py-4 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {isLoading && workOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center text-gray-500">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-brand-500 mb-4" />
                    <p className="font-medium text-gray-600">Loading work orders...</p>
                  </td>
                </tr>
              ) : workOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center text-gray-500">
                    <Wrench className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                    <p className="font-medium text-gray-600">No work orders found.</p>
                    <p className="text-sm mt-1 text-gray-400">Try adjusting your filters or create a new order.</p>
                  </td>
                </tr>
              ) : (
                workOrders.map((wo) => (
                  <tr key={wo.id} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-bold text-gray-900">{wo.workOrderNumber}</div>
                      <div className="text-xs text-gray-500 mt-1">{new Date(wo.createdAt).toLocaleDateString()}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{wo.item.name}</div>
                      <div className="text-xs text-gray-500 mt-1 font-mono">SKU: {wo.item.sku}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 font-medium">{wo.location.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-extrabold">
                      {wo.requiredQuantity}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {wo.assignedUser ? (
                        <div className="text-sm font-medium text-indigo-700 bg-indigo-50 inline-block px-2 py-0.5 rounded-md border border-indigo-100">{wo.assignedUser.name}</div>
                      ) : (
                        <span className="text-sm text-gray-400 italic">Unassigned</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      {getStatusBadge(wo.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                      <button
                        onClick={() => setStockCheckRecord(wo)}
                        className="text-gray-500 hover:text-brand-600 bg-white border border-gray-200 hover:border-brand-200 px-3 py-1.5 rounded-lg transition-all shadow-sm"
                      >
                        Stock Check
                      </button>
                      {canEdit && wo.status !== 'COMPLETED' && (
                        <button
                          onClick={() => setStatusRecord(wo)}
                          className="text-slate-900 bg-brand-400 hover:bg-brand-500 px-3 py-1.5 rounded-lg transition-all shadow-sm font-bold"
                        >
                          Update
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

      <CreateWorkOrderModal 
        isOpen={isCreateOpen} 
        onClose={() => setIsCreateOpen(false)} 
        onSuccess={loadData} 
      />
      
      <UpdateStatusModal 
        workOrder={statusRecord} 
        onClose={() => setStatusRecord(null)} 
        onSuccess={loadData} 
      />

      <StockCheckModal 
        workOrder={stockCheckRecord} 
        onClose={() => setStockCheckRecord(null)} 
      />
    </div>
  );
}

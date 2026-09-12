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
      case 'ASSIGNED': return <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded-full text-xs font-semibold">Assigned</span>;
      case 'IN_PROGRESS': return <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-semibold">In Progress</span>;
      case 'COMPLETED': return <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-semibold">Completed</span>;
      default: return null;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <Wrench className="h-6 w-6 mr-2 text-blue-600" />
            Work Orders
          </h1>
          <p className="text-gray-500 text-sm mt-1">Manage manufacturing and production tasks.</p>
        </div>
        
        <div className="flex space-x-3">
          <button
            onClick={loadData}
            className="px-4 py-2 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg font-medium flex items-center transition-colors"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          
          {canCreate && (
            <button
              onClick={() => setIsCreateOpen(true)}
              className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg font-medium flex items-center transition-colors shadow-sm"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Work Order
            </button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <p className="text-sm font-medium text-gray-500">Total Work Orders</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{totalOrders}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <p className="text-sm font-medium text-gray-500">Assigned</p>
          <p className="text-2xl font-bold text-gray-600 mt-1">{assignedOrders}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <p className="text-sm font-medium text-gray-500">In Progress</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">{inProgressOrders}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <p className="text-sm font-medium text-gray-500">Completed</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{completedOrders}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-4">
        <input
          type="text"
          placeholder="Search by WO# or Item..."
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
          <option value="ASSIGNED">Assigned</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="COMPLETED">Completed</option>
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">WO Number</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Qty Req</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assigned To</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading && workOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600 mb-2" />
                    Loading work orders...
                  </td>
                </tr>
              ) : workOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    No work orders found.
                  </td>
                </tr>
              ) : (
                workOrders.map((wo) => (
                  <tr key={wo.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-bold text-gray-900">{wo.workOrderNumber}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{new Date(wo.createdAt).toLocaleDateString()}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{wo.item.name}</div>
                      <div className="text-xs text-gray-500">SKU: {wo.item.sku}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{wo.location.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-medium">
                      {wo.requiredQuantity}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {wo.assignedUser ? (
                        <div className="text-sm text-gray-900">{wo.assignedUser.name}</div>
                      ) : (
                        <span className="text-sm text-gray-400 italic">Unassigned</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      {getStatusBadge(wo.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-3">
                      <button
                        onClick={() => setStockCheckRecord(wo)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        Stock Check
                      </button>
                      {canEdit && wo.status !== 'COMPLETED' && (
                        <button
                          onClick={() => setStatusRecord(wo)}
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          Update Status
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

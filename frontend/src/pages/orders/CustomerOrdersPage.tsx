import { useState, useEffect, useCallback } from 'react';
import { ShoppingCart, Plus, RefreshCw, AlertCircle, Loader2 } from 'lucide-react';
import { fetchOrders } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import type { CustomerOrderRecord, OrderStatus } from '../../types/order';
import CreateOrderModal from './CreateOrderModal';
import OrderDetailsModal from './OrderDetailsModal';

export default function CustomerOrdersPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<CustomerOrderRecord[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [detailsRecord, setDetailsRecord] = useState<CustomerOrderRecord | null>(null);

  // RBAC checks matching backend
  const canCreate = user?.role === 'SALES';

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const params: any = {};
      if (statusFilter) params.status = statusFilter;

      let data = await fetchOrders(params);
      
      if (search) {
        const s = search.toLowerCase();
        data = data.filter((o: CustomerOrderRecord) => 
          o.orderNumber.toLowerCase().includes(s) || 
          o.createdBy.name.toLowerCase().includes(s)
        );
      }
      
      setOrders(data);
    } catch (err) {
      setError('Failed to load customer orders.');
    } finally {
      setIsLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Derived metrics
  const totalOrders = orders.length;
  const createdCount = orders.filter(o => o.status === 'CREATED').length;
  const reservedCount = orders.filter(o => o.status === 'RESERVED').length;
  const completedCount = orders.filter(o => o.status === 'COMPLETED').length;
  const cancelledCount = orders.filter(o => o.status === 'CANCELLED').length;

  const handleResetFilters = () => {
    setSearch('');
    setStatusFilter('');
  };

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'CREATED': return <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded-full text-xs font-semibold">Created</span>;
      case 'RESERVED': return <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs font-semibold">Reserved</span>;
      case 'COMPLETED': return <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-semibold">Completed</span>;
      case 'CANCELLED': return <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs font-semibold">Cancelled</span>;
      default: return null;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <ShoppingCart className="h-6 w-6 mr-2 text-yellow-600" />
            Customer Orders
          </h1>
          <p className="text-gray-500 text-sm mt-1">Manage external orders and inventory reservation.</p>
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
              className="px-4 py-2 bg-yellow-600 text-white hover:bg-yellow-700 rounded-lg font-medium flex items-center transition-colors shadow-sm"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Order
            </button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <p className="text-sm font-medium text-gray-500">Total Orders</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{totalOrders}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <p className="text-sm font-medium text-gray-500">Created</p>
          <p className="text-2xl font-bold text-gray-600 mt-1">{createdCount}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <p className="text-sm font-medium text-gray-500">Reserved</p>
          <p className="text-2xl font-bold text-yellow-600 mt-1">{reservedCount}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <p className="text-sm font-medium text-gray-500">Completed</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{completedCount}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <p className="text-sm font-medium text-gray-500">Cancelled</p>
          <p className="text-2xl font-bold text-red-600 mt-1">{cancelledCount}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-4">
        <input
          type="text"
          placeholder="Search by Order# or Sales Rep..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 border border-gray-300 rounded-lg p-2 text-sm focus:ring-yellow-500 focus:border-yellow-500"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-gray-300 rounded-lg p-2 text-sm focus:ring-yellow-500 focus:border-yellow-500 w-full md:w-48"
        >
          <option value="">All Statuses</option>
          <option value="CREATED">Created</option>
          <option value="RESERVED">Reserved</option>
          <option value="COMPLETED">Completed</option>
          <option value="CANCELLED">Cancelled</option>
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order Number</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sales Representative</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total Items</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total Qty</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading && orders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-yellow-600 mb-2" />
                    Loading orders...
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    No customer orders found.
                  </td>
                </tr>
              ) : (
                orders.map((order) => {
                  const itemCount = order.items.length;
                  const totalQty = order.items.reduce((sum, i) => sum + i.quantity, 0);

                  return (
                    <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-bold text-gray-900">{order.orderNumber}</div>
                        <div className="text-xs text-gray-500 mt-0.5">{new Date(order.createdAt).toLocaleDateString()}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{order.createdBy.name}</div>
                        <div className="text-xs text-gray-500">{order.createdBy.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                        {itemCount}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-gray-900">
                        {totalQty}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        {getStatusBadge(order.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => setDetailsRecord(order)}
                          className="text-yellow-600 hover:text-yellow-900"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <CreateOrderModal 
        isOpen={isCreateOpen} 
        onClose={() => setIsCreateOpen(false)} 
        onSuccess={loadData} 
      />
      
      <OrderDetailsModal 
        order={detailsRecord} 
        onClose={() => setDetailsRecord(null)} 
        onSuccess={loadData}
      />
    </div>
  );
}

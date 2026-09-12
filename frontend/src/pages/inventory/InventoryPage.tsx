import { useState, useEffect, useCallback } from 'react';
import { Package, Plus, RefreshCw, AlertCircle, Loader2 } from 'lucide-react';
import { fetchInventory, fetchCategories, fetchLocations } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import type { InventoryRecord, Category, Location } from '../../types/inventory';
import CreateInventoryModal from './CreateInventoryModal';
import AdjustStockModal from './AdjustStockModal';
import TransactionHistoryModal from './TransactionHistoryModal';

export default function InventoryPage() {
  const { user } = useAuth();
  const [inventory, setInventory] = useState<InventoryRecord[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Filters
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [locationId, setLocationId] = useState('');

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [adjustRecord, setAdjustRecord] = useState<InventoryRecord | null>(null);
  const [historyRecordId, setHistoryRecordId] = useState<string | null>(null);

  const canEdit = user?.role === 'ADMIN' || user?.role === 'OPERATIONS';

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      // Build query params
      const params: any = {};
      if (search) params.search = search;
      if (categoryId) params.categoryId = categoryId;
      if (locationId) params.locationId = locationId;

      // Load reference data only once if not loaded
      if (categories.length === 0) {
        const [invData, catData, locData] = await Promise.all([
          fetchInventory(params),
          fetchCategories().catch(() => []),
          fetchLocations().catch(() => []),
        ]);
        setInventory(invData);
        if (catData.length) setCategories(catData);
        if (locData.length) setLocations(locData);
      } else {
        const invData = await fetchInventory(params);
        setInventory(invData);
      }
    } catch (err) {
      setError('Failed to load inventory data.');
    } finally {
      setIsLoading(false);
    }
  }, [search, categoryId, locationId, categories.length]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Derived metrics
  const totalRecords = inventory.length;
  const totalPhysical = inventory.reduce((sum, r) => sum + r.physicalQuantity, 0);
  const totalReserved = inventory.reduce((sum, r) => sum + r.reservedQuantity, 0);
  const totalAvailable = inventory.reduce((sum, r) => sum + r.availableQuantity, 0);

  const handleResetFilters = () => {
    setSearch('');
    setCategoryId('');
    setLocationId('');
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <Package className="h-6 w-6 mr-2 text-yellow-600" />
            Inventory Management
          </h1>
          <p className="text-gray-500 text-sm mt-1">Track and manage material stock across all locations.</p>
        </div>
        
        <div className="flex space-x-3">
          <button
            onClick={loadData}
            className="px-4 py-2 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg font-medium flex items-center transition-colors"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          
          {canEdit && (
            <button
              onClick={() => setIsCreateOpen(true)}
              className="px-4 py-2 bg-yellow-600 text-white hover:bg-yellow-700 rounded-lg font-medium flex items-center transition-colors shadow-sm"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Inventory
            </button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <p className="text-sm font-medium text-gray-500">Total Records</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{totalRecords}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <p className="text-sm font-medium text-gray-500">Total Physical Qty</p>
          <p className="text-2xl font-bold text-yellow-600 mt-1">{totalPhysical.toLocaleString()}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <p className="text-sm font-medium text-gray-500">Total Reserved Qty</p>
          <p className="text-2xl font-bold text-orange-600 mt-1">{totalReserved.toLocaleString()}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <p className="text-sm font-medium text-gray-500">Total Available Qty</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{totalAvailable.toLocaleString()}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-4">
        <input
          type="text"
          placeholder="Search items or SKUs..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 border border-gray-300 rounded-lg p-2 text-sm focus:ring-yellow-500 focus:border-yellow-500"
        />
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className="border border-gray-300 rounded-lg p-2 text-sm focus:ring-yellow-500 focus:border-yellow-500"
        >
          <option value="">All Categories</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select
          value={locationId}
          onChange={(e) => setLocationId(e.target.value)}
          className="border border-gray-300 rounded-lg p-2 text-sm focus:ring-yellow-500 focus:border-yellow-500"
        >
          <option value="">All Locations</option>
          {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Batch</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Physical</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Reserved</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Available</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading && inventory.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-yellow-600 mb-2" />
                    Loading inventory...
                  </td>
                </tr>
              ) : inventory.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                    No inventory records found.
                  </td>
                </tr>
              ) : (
                inventory.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{row.item.name}</div>
                      <div className="text-xs text-gray-500">SKU: {row.item.sku}</div>
                      {row.item.category && <div className="text-xs text-yellow-600 mt-0.5">{row.item.category.name}</div>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{row.location.name}</div>
                      <div className="text-xs text-gray-500">{row.location.code}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 font-mono text-xs bg-gray-100 px-2 py-1 rounded inline-block">
                        {row.batch?.batchNumber || 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-medium">
                      {row.physicalQuantity}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-medium">
                      {row.reservedQuantity}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-bold">
                      {row.availableQuantity}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        row.availableQuantity === 0 ? 'bg-red-100 text-red-800' :
                        row.availableQuantity <= 10 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {row.availableQuantity === 0 ? 'Zero' : row.availableQuantity <= 10 ? 'Low' : 'Sufficient'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => setHistoryRecordId(row.id)}
                        className="text-yellow-600 hover:text-yellow-900 mr-4"
                      >
                        History
                      </button>
                      {canEdit && (
                        <button
                          onClick={() => setAdjustRecord(row)}
                          className="text-yellow-600 hover:text-yellow-900"
                        >
                          Adjust
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

      <CreateInventoryModal 
        isOpen={isCreateOpen} 
        onClose={() => setIsCreateOpen(false)} 
        onSuccess={loadData} 
      />
      
      <AdjustStockModal 
        record={adjustRecord} 
        onClose={() => setAdjustRecord(null)} 
        onSuccess={loadData} 
      />

      <TransactionHistoryModal 
        inventoryId={historyRecordId} 
        onClose={() => setHistoryRecordId(null)} 
      />
    </div>
  );
}

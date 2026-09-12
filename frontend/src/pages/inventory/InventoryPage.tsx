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
          <h1 className="text-2xl font-extrabold text-gray-900 flex items-center tracking-tight">
            <Package className="h-7 w-7 mr-3 text-brand-500" />
            Inventory Management
          </h1>
          <p className="text-gray-500 text-sm mt-2 font-medium">Track and manage material stock across all locations.</p>
        </div>
        
        <div className="flex space-x-3">
          <button
            onClick={loadData}
            className="px-4 py-2.5 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-xl font-medium flex items-center transition-all shadow-sm"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          
          {canEdit && (
            <button
              onClick={() => setIsCreateOpen(true)}
              className="px-4 py-2.5 bg-brand-500 text-slate-900 hover:bg-brand-400 rounded-xl font-bold flex items-center transition-all shadow-sm"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Inventory
            </button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Total Records</p>
          <p className="text-3xl font-extrabold text-gray-900 mt-2">{totalRecords}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Total Physical</p>
          <p className="text-3xl font-extrabold text-brand-600 mt-2">{totalPhysical.toLocaleString()}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Total Reserved</p>
          <p className="text-3xl font-extrabold text-indigo-600 mt-2">{totalReserved.toLocaleString()}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Total Available</p>
          <p className="text-3xl font-extrabold text-emerald-600 mt-2">{totalAvailable.toLocaleString()}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-4">
        <input
          type="text"
          placeholder="Search items or SKUs..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 border border-gray-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 shadow-sm transition-all"
        />
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className="border border-gray-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 shadow-sm transition-all"
        >
          <option value="">All Categories</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select
          value={locationId}
          onChange={(e) => setLocationId(e.target.value)}
          className="border border-gray-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 shadow-sm transition-all"
        >
          <option value="">All Locations</option>
          {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
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
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Item</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Location</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Batch</th>
                <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Physical</th>
                <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Reserved</th>
                <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Available</th>
                <th className="px-6 py-4 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {isLoading && inventory.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-16 text-center text-gray-500">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-brand-500 mb-4" />
                    <p className="font-medium text-gray-600">Loading inventory...</p>
                  </td>
                </tr>
              ) : inventory.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-16 text-center text-gray-500">
                    <Package className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                    <p className="font-medium text-gray-600">No inventory records found.</p>
                    <p className="text-sm mt-1 text-gray-400">Try adjusting your filters or add new inventory.</p>
                  </td>
                </tr>
              ) : (
                inventory.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-bold text-gray-900">{row.item.name}</div>
                      <div className="text-xs text-gray-500 mt-1 font-mono">SKU: {row.item.sku}</div>
                      {row.item.category && <div className="text-xs font-medium text-brand-600 mt-1 bg-brand-50 inline-block px-2 py-0.5 rounded-md">{row.item.category.name}</div>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{row.location.name}</div>
                      <div className="text-xs text-gray-500 mt-1 font-mono bg-gray-100 inline-block px-1.5 py-0.5 rounded">{row.location.code}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 font-mono text-xs bg-slate-100 border border-slate-200 px-2 py-1 rounded-md inline-block">
                        {row.batch?.batchNumber || 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 text-right font-medium">
                      {row.physicalQuantity}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-indigo-600 text-right font-medium">
                      {row.reservedQuantity}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-emerald-700 text-right font-extrabold">
                      {row.availableQuantity}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className={`px-3 py-1 inline-flex text-xs leading-5 font-bold rounded-full border ${
                        row.availableQuantity === 0 ? 'bg-red-50 text-red-700 border-red-200' :
                        row.availableQuantity <= 10 ? 'bg-amber-50 text-amber-700 border-amber-200' :
                        'bg-emerald-50 text-emerald-700 border-emerald-200'
                      }`}>
                        {row.availableQuantity === 0 ? 'Zero' : row.availableQuantity <= 10 ? 'Low' : 'Sufficient'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => setHistoryRecordId(row.id)}
                        className="text-gray-500 hover:text-brand-600 bg-white border border-gray-200 hover:border-brand-200 px-3 py-1.5 rounded-lg mr-2 transition-all shadow-sm"
                      >
                        History
                      </button>
                      {canEdit && (
                        <button
                          onClick={() => setAdjustRecord(row)}
                          className="text-slate-900 bg-brand-400 hover:bg-brand-500 px-3 py-1.5 rounded-lg transition-all shadow-sm font-bold"
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

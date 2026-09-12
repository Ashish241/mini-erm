import { useAuth } from '../contexts/AuthContext';
import { 
  Package, 
  Wrench, 
  ArrowRightLeft, 
  ShoppingCart, 
  AlertCircle,
  Activity
} from 'lucide-react';

export default function Dashboard() {
  const { user } = useAuth();

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'ADMIN': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'OPERATIONS': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'SALES': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const hasAccess = (allowedRoles: string[]) => {
    if (!user) return false;
    if (user.role === 'ADMIN') return true;
    return allowedRoles.includes(user.role);
  };

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Welcome back, {user?.name}</h1>
          <p className="text-gray-500 mt-1">Mini Operations ERP Dashboard</p>
        </div>
        <div className={`px-4 py-2 rounded-full border text-sm font-bold tracking-wide ${getRoleColor(user?.role || '')}`}>
          {user?.role}
        </div>
      </div>

      {/* Module Overview Placeholders */}
      <div>
        <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
          <Activity className="h-5 w-5 mr-2 text-yellow-600" />
          System Overview
        </h2>
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6 rounded-r-lg">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertCircle className="h-5 w-5 text-yellow-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                <strong>Note:</strong> The metrics shown below are UI placeholders for Phase 1. Real-time data integration is pending subsequent phases.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {hasAccess(['OPERATIONS']) && (
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-gray-500">Total Inventory</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">--</p>
                </div>
                <div className="p-3 bg-yellow-50 rounded-lg">
                  <Package className="h-6 w-6 text-yellow-600" />
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-4">Data unavailable (Placeholder)</p>
            </div>
          )}

          {hasAccess(['OPERATIONS']) && (
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-gray-500">Active Work Orders</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">--</p>
                </div>
                <div className="p-3 bg-orange-50 rounded-lg">
                  <Wrench className="h-6 w-6 text-orange-600" />
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-4">Data unavailable (Placeholder)</p>
            </div>
          )}

          {hasAccess(['OPERATIONS']) && (
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-gray-500">Pending Transfers</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">--</p>
                </div>
                <div className="p-3 bg-yellow-50 rounded-lg">
                  <ArrowRightLeft className="h-6 w-6 text-yellow-600" />
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-4">Data unavailable (Placeholder)</p>
            </div>
          )}

          {hasAccess(['SALES']) && (
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-gray-500">Active Orders</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">--</p>
                </div>
                <div className="p-3 bg-green-50 rounded-lg">
                  <ShoppingCart className="h-6 w-6 text-green-600" />
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-4">Data unavailable (Placeholder)</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

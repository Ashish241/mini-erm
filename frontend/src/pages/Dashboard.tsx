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
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-brand-50 rounded-full mix-blend-multiply filter blur-3xl opacity-50 -translate-y-1/2 translate-x-1/3"></div>
        <div className="relative z-10">
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Welcome back, {user?.name}</h1>
          <p className="text-gray-500 mt-2 font-medium">Here's your operational overview for today.</p>
        </div>
        <div className={`px-4 py-2 rounded-lg border text-sm font-bold tracking-wide shadow-sm relative z-10 ${getRoleColor(user?.role || '')}`}>
          {user?.role}
        </div>
      </div>

      {/* Module Overview Placeholders */}
      <div>
        <h2 className="text-lg font-bold text-gray-900 mb-6 flex items-center">
          <Activity className="h-5 w-5 mr-2 text-brand-600" />
          System Overview
        </h2>
        <div className="bg-amber-50/50 border border-amber-200 p-4 mb-8 rounded-xl shadow-sm flex items-start">
          <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" />
          <div className="ml-3">
            <h3 className="text-sm font-semibold text-amber-800">Integration Pending</h3>
            <p className="text-sm text-amber-700 mt-1">
              The metrics shown below are layout placeholders. Real-time data integration will be connected in subsequent phases.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {hasAccess(['OPERATIONS']) && (
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow group">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-gray-500 group-hover:text-gray-700 transition-colors">Total Inventory</p>
                  <p className="text-3xl font-extrabold text-gray-900 mt-2 tracking-tight">--</p>
                </div>
                <div className="p-3 bg-brand-50 text-brand-600 rounded-xl group-hover:bg-brand-100 transition-colors">
                  <Package className="h-6 w-6" />
                </div>
              </div>
              <div className="mt-4 flex items-center text-xs text-gray-400 font-medium">
                <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-md">Pending API</span>
              </div>
            </div>
          )}

          {hasAccess(['OPERATIONS']) && (
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow group">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-gray-500 group-hover:text-gray-700 transition-colors">Active Work Orders</p>
                  <p className="text-3xl font-extrabold text-gray-900 mt-2 tracking-tight">--</p>
                </div>
                <div className="p-3 bg-orange-50 text-orange-600 rounded-xl group-hover:bg-orange-100 transition-colors">
                  <Wrench className="h-6 w-6" />
                </div>
              </div>
              <div className="mt-4 flex items-center text-xs text-gray-400 font-medium">
                <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-md">Pending API</span>
              </div>
            </div>
          )}

          {hasAccess(['OPERATIONS']) && (
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow group">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-gray-500 group-hover:text-gray-700 transition-colors">Pending Transfers</p>
                  <p className="text-3xl font-extrabold text-gray-900 mt-2 tracking-tight">--</p>
                </div>
                <div className="p-3 bg-blue-50 text-blue-600 rounded-xl group-hover:bg-blue-100 transition-colors">
                  <ArrowRightLeft className="h-6 w-6" />
                </div>
              </div>
              <div className="mt-4 flex items-center text-xs text-gray-400 font-medium">
                <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-md">Pending API</span>
              </div>
            </div>
          )}

          {hasAccess(['SALES']) && (
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow group">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-gray-500 group-hover:text-gray-700 transition-colors">Active Orders</p>
                  <p className="text-3xl font-extrabold text-gray-900 mt-2 tracking-tight">--</p>
                </div>
                <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl group-hover:bg-emerald-100 transition-colors">
                  <ShoppingCart className="h-6 w-6" />
                </div>
              </div>
              <div className="mt-4 flex items-center text-xs text-gray-400 font-medium">
                <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-md">Pending API</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

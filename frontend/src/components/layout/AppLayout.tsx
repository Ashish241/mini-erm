import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { 
  Boxes, 
  LayoutDashboard, 
  Package, 
  Wrench, 
  ArrowRightLeft, 
  ShoppingCart, 
  LogOut,
  Menu,
  X
} from 'lucide-react';

export default function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const hasAccess = (allowedRoles: string[]) => {
    if (!user) return false;
    if (user.role === 'ADMIN') return true;
    return allowedRoles.includes(user.role);
  };

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, roles: ['ADMIN', 'OPERATIONS', 'SALES'] },
    { name: 'Inventory', path: '/inventory', icon: Package, roles: ['ADMIN', 'OPERATIONS'] },
    { name: 'Work Orders', path: '/work-orders', icon: Wrench, roles: ['ADMIN', 'OPERATIONS'] },
    { name: 'Transfers', path: '/transfers', icon: ArrowRightLeft, roles: ['ADMIN', 'OPERATIONS'] },
    { name: 'Customer Orders', path: '/orders', icon: ShoppingCart, roles: ['ADMIN', 'SALES'] },
  ];

  const visibleNavItems = navItems.filter(item => hasAccess(item.roles));

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-gray-900 bg-opacity-50 z-40 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={`fixed inset-y-0 left-0 bg-slate-900 text-slate-300 w-64 z-50 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:flex-shrink-0 flex flex-col ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="h-16 flex items-center px-6 bg-slate-950 flex-shrink-0 border-b border-slate-800">
          <Boxes className="h-8 w-8 text-brand-500 mr-3" />
          <span className="text-lg font-bold tracking-tight text-white">Mini ERP</span>
          <button 
            className="ml-auto lg:hidden text-gray-400 hover:text-white"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {visibleNavItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.name}
                to={item.path}
                onClick={() => setIsMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center px-4 py-3 rounded-xl transition-all duration-200 font-medium ${
                    isActive 
                      ? 'bg-brand-500 text-slate-900 shadow-lg shadow-brand-500/20' 
                      : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                  }`
                }
              >
                <Icon className="h-5 w-5 mr-3 flex-shrink-0" />
                {item.name}
              </NavLink>
            );
          })}
        </nav>

        <div className="p-4 bg-slate-950 flex-shrink-0 border-t border-slate-800">
          <button
            onClick={handleLogout}
            className="flex items-center w-full px-4 py-3 text-slate-400 hover:bg-slate-800 hover:text-white rounded-xl transition-colors font-medium"
          >
            <LogOut className="h-5 w-5 mr-3 flex-shrink-0" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <header className="h-16 bg-white/80 backdrop-blur-md border-b border-gray-200 flex items-center justify-between px-4 sm:px-6 lg:px-8 z-10 flex-shrink-0 sticky top-0">
          <button 
            className="lg:hidden p-2 -ml-2 text-gray-600 hover:text-gray-900 focus:outline-none"
            onClick={() => setIsMobileMenuOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </button>

          <div className="flex-1" /> {/* Spacer */}

          <div className="flex items-center space-x-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold text-gray-900">{user?.name}</p>
              <p className="text-xs font-medium text-brand-600 uppercase tracking-wider">{user?.role}</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-brand-100 flex items-center justify-center text-brand-700 font-bold border border-brand-200 shadow-sm">
              {user?.name?.charAt(0).toUpperCase() || 'U'}
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

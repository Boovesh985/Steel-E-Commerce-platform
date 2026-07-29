import { NavLink, Outlet, Navigate } from 'react-router-dom';
import { LayoutDashboard, ShoppingBag, Package, Warehouse, Users, ArrowLeft, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { useAuthStore } from '../../stores/authStore';
import ToastContainer from '../../components/ui/Toast';

const navItems = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/orders', label: 'Orders', icon: ShoppingBag },
  { to: '/admin/products', label: 'Products', icon: Package },
  { to: '/admin/inventory', label: 'Inventory', icon: Warehouse },
  { to: '/admin/users', label: 'Users', icon: Users },
];

export default function AdminLayout() {
  const isAdmin = useAuthStore((s) => s.isAdmin());
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  if (!isAdmin) return <Navigate to="/login" replace />;

  return (
    <div className="min-h-screen flex bg-bg">
      {/* Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 bg-text text-white flex-shrink-0">
        <div className="h-16 flex items-center gap-2 px-5 border-b border-white/10">
          <div className="w-9 h-9 bg-primary rounded-standard flex items-center justify-center">
            <span className="text-white font-mono font-bold text-sm">AMK</span>
          </div>
          <span className="text-label-md text-white">Admin Console</span>
        </div>
        <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 h-11 rounded-standard text-body-sm transition-colors ${
                  isActive ? 'bg-primary text-white' : 'text-white/70 hover:bg-white/5 hover:text-white'
                }`
              }
            >
              <Icon className="w-4.5 h-4.5" /> {label}
            </NavLink>
          ))}
        </nav>
        <NavLink to="/" className="flex items-center gap-3 px-3 h-11 mx-3 mb-4 rounded-standard text-body-sm text-white/70 hover:bg-white/5 hover:text-white">
          <ArrowLeft className="w-4.5 h-4.5" /> Back to storefront
        </NavLink>
      </aside>

      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 h-14 bg-text text-white flex items-center justify-between px-4">
        <span className="text-label-md">Admin Console</span>
        <button onClick={() => setMobileNavOpen((v) => !v)} aria-label="Toggle admin menu">
          {mobileNavOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>
      {mobileNavOpen && (
        <div className="lg:hidden fixed top-14 left-0 right-0 z-40 bg-text text-white px-3 py-3 flex flex-col gap-1">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={() => setMobileNavOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 h-11 rounded-standard text-body-sm ${isActive ? 'bg-primary text-white' : 'text-white/70'}`
              }
            >
              <Icon className="w-4.5 h-4.5" /> {label}
            </NavLink>
          ))}
          <NavLink to="/" className="flex items-center gap-3 px-3 h-11 rounded-standard text-body-sm text-white/70">
            <ArrowLeft className="w-4.5 h-4.5" /> Back to storefront
          </NavLink>
        </div>
      )}

      <main className="flex-1 min-w-0 pt-14 lg:pt-0">
        <div className="p-4 lg:p-8">
          <Outlet />
        </div>
      </main>
      <ToastContainer />
    </div>
  );
}

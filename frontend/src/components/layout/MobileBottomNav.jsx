import { NavLink } from 'react-router-dom';
import { Home, LayoutGrid, ShoppingCart, Package, User, LayoutDashboard } from 'lucide-react';
import clsx from 'clsx';
import { useCartStore } from '../../stores/cartStore';
import { useAuthStore } from '../../stores/authStore';

const dealerItems = [
  { to: '/', label: 'Home', icon: Home, end: true },
  { to: '/products', label: 'Shop', icon: LayoutGrid },
  { to: '/cart', label: 'Cart', icon: ShoppingCart, badge: true },
  { to: '/orders', label: 'Orders', icon: Package },
  { to: '/profile', label: 'Account', icon: User },
];

const adminItems = [
  { to: '/', label: 'Home', icon: Home, end: true },
  { to: '/products', label: 'Shop', icon: LayoutGrid },
  { to: '/admin', label: 'Admin', icon: LayoutDashboard },
  { to: '/admin/orders', label: 'Orders', icon: Package },
  { to: '/profile', label: 'Account', icon: User },
];

export default function MobileBottomNav() {
  const itemCount = useCartStore((s) => s.itemCount);
  const isAdmin = useAuthStore((s) => s.isAdmin());
  const navItems = isAdmin ? adminItems : dealerItems;

  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-surface border-t border-border safe-bottom"
      style={{ height: 'calc(64px + env(safe-area-inset-bottom))' }}
    >
      <div className="grid grid-cols-5 h-16">
        {navItems.map(({ to, label, icon: Icon, end, badge }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              clsx(
                'flex flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors',
                isActive ? 'text-primary' : 'text-text-secondary'
              )
            }
          >
            <div className="relative transition-transform duration-200 [.text-primary_&]:scale-110">
              <Icon className="w-5.5 h-5.5" strokeWidth={2} />
              {badge && !isAdmin && itemCount > 0 && (
                <span className="absolute -top-1.5 -right-2 min-w-[16px] h-[16px] px-1 rounded-full bg-accent text-white text-[9px] font-bold flex items-center justify-center animate-heart-pop">
                  {itemCount > 99 ? '99+' : itemCount}
                </span>
              )}
            </div>
            {label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

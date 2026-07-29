import { Link } from 'react-router-dom';
import { IndianRupee, ShoppingBag, Users, AlertTriangle, ArrowRight, Package } from 'lucide-react';
import { useAdminDashboard } from '../../hooks/useAdmin';
import OrderStatusBadge from '../../components/order/OrderStatusBadge';
import { FullPageSpinner } from '../../components/ui/Spinner';
import { toNumber } from '../../utils/product';

export default function AdminDashboard() {
  const { data, isLoading } = useAdminDashboard();

  if (isLoading) return <FullPageSpinner />;

  // The exact shape of GET /admin/dashboard isn't fully specified in the API
  // doc, so this reads a handful of plausible key names defensively. Adjust
  // these accessors to match your actual handler's response.
  const revenue = data?.totalRevenue ?? data?.revenue ?? data?.metrics?.totalRevenue ?? 0;
  const orderCount = data?.totalOrders ?? data?.orderCount ?? data?.metrics?.totalOrders ?? 0;
  const userCount = data?.totalUsers ?? data?.userCount ?? data?.metrics?.totalUsers ?? 0;
  const lowStockItems = data?.lowStockItems ?? data?.lowStock ?? [];
  const recentOrders = data?.recentOrders ?? data?.orders ?? [];

  const cards = [
    { label: 'Total revenue', value: `₹${toNumber(revenue).toLocaleString('en-IN')}`, icon: IndianRupee, variant: 'primary' },
    { label: 'Total orders', value: orderCount, icon: ShoppingBag, variant: 'accent' },
    { label: 'Registered users', value: userCount, icon: Users, variant: 'success' },
    { label: 'Low stock items', value: lowStockItems.length, icon: AlertTriangle, variant: 'warning' },
  ];

  const iconBg = {
    primary: 'bg-primary-light text-primary',
    accent: 'bg-accent/10 text-accent-dark',
    success: 'bg-success/10 text-success',
    warning: 'bg-warning/10 text-warning',
  };

  return (
    <div>
      <h1 className="text-headline-lg text-text mb-6">Dashboard</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {cards.map((card) => (
          <div key={card.label} className="bg-surface border border-border rounded-container p-4">
            <div className={`w-10 h-10 rounded-standard flex items-center justify-center mb-3 ${iconBg[card.variant]}`}>
              <card.icon className="w-5 h-5" />
            </div>
            <p className="text-headline-md text-text font-mono">{card.value}</p>
            <p className="text-body-sm text-text-secondary mt-1">{card.label}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent orders */}
        <section className="bg-surface border border-border rounded-container p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-headline-md text-text">Recent orders</h2>
            <Link to="/admin/orders" className="text-body-sm text-primary flex items-center gap-1">
              View all <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="flex flex-col gap-3">
            {recentOrders.slice(0, 6).map((order) => (
              <Link key={order.id} to="/admin/orders" className="flex items-center justify-between text-body-sm py-2 border-b border-border last:border-0">
                <div>
                  <p className="text-text font-medium">#{order.orderNumber || order.id}</p>
                  <p className="text-text-secondary text-body-sm">{order.user?.name || order.customerName}</p>
                </div>
                <div className="text-right">
                  <p className="font-mono text-text">₹{toNumber(order.totalAmount).toLocaleString('en-IN')}</p>
                  <OrderStatusBadge status={order.status} className="mt-1" />
                </div>
              </Link>
            ))}
            {recentOrders.length === 0 && <p className="text-body-sm text-text-secondary">No recent orders.</p>}
          </div>
        </section>

        {/* Low stock */}
        <section className="bg-surface border border-border rounded-container p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-headline-md text-text">Low stock alerts</h2>
            <Link to="/admin/inventory" className="text-body-sm text-primary flex items-center gap-1">
              Manage <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="flex flex-col gap-3">
            {lowStockItems.slice(0, 6).map((item, idx) => (
              <div key={item.id || item.productId || idx} className="flex items-center justify-between text-body-sm py-2 border-b border-border last:border-0">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-standard bg-bg flex items-center justify-center flex-shrink-0">
                    <Package className="w-4 h-4 text-text-secondary" />
                  </div>
                  <p className="text-text truncate">{item.name || item.productName}</p>
                </div>
                <span className="text-warning font-mono flex-shrink-0">{item.quantityAvailable ?? item.stockQty ?? 0} left</span>
              </div>
            ))}
            {lowStockItems.length === 0 && <p className="text-body-sm text-text-secondary">No low stock items right now.</p>}
          </div>
        </section>
      </div>
    </div>
  );
}

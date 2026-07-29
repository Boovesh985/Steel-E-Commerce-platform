import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Package, ChevronRight } from 'lucide-react';
import { useOrders } from '../hooks/useOrders';
import OrderStatusBadge from '../components/order/OrderStatusBadge';
import { FullPageSpinner } from '../components/ui/Spinner';
import Button from '../components/ui/Button';
import { toNumber } from '../utils/product';

const filters = [
  { value: '', label: 'All orders' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'PROCESSING', label: 'Processing' },
  { value: 'SHIPPED', label: 'Shipped' },
  { value: 'DELIVERED', label: 'Delivered' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

export default function OrdersPage() {
  const [status, setStatus] = useState('');
  const { data, isLoading } = useOrders({ status: status || undefined });
  const orders = data?.items || data?.orders || [];

  return (
    <div className="max-w-4xl mx-auto px-4 lg:px-6 py-6">
      <h1 className="text-headline-lg text-text mb-5">My orders</h1>

      <div className="flex gap-2 overflow-x-auto pb-2 mb-6 scrollbar-none">
        {filters.map((f) => (
          <button
            key={f.value}
            onClick={() => setStatus(f.value)}
            className={`px-4 h-9 rounded-standard text-body-sm whitespace-nowrap flex-shrink-0 transition-colors ${
              status === f.value ? 'bg-primary text-white' : 'bg-surface border border-border text-text-secondary'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <FullPageSpinner />
      ) : orders.length === 0 ? (
        <div className="flex flex-col items-center text-center gap-3 py-16">
          <Package className="w-10 h-10 text-text-secondary" />
          <p className="text-headline-md text-text">No orders yet</p>
          <Link to="/products">
            <Button variant="accent">Start shopping</Button>
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {orders.map((order) => (
            <Link
              key={order.id}
              to={`/orders/${order.id}`}
              className="flex items-center justify-between gap-4 bg-surface border border-border rounded-container p-4 hover:border-primary transition-colors"
            >
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-12 h-12 rounded-standard bg-bg flex-shrink-0 flex items-center justify-center">
                  <Package className="w-5 h-5 text-text-secondary" />
                </div>
                <div className="min-w-0">
                  <p className="text-body-md font-semibold text-text">Order #{order.orderNumber}</p>
                  <p className="text-body-sm text-text-secondary">
                    {new Date(order.createdAt).toLocaleDateString('en-IN')} · {order.items?.length ?? 0} items
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <div className="text-right hidden sm:block">
                  <p className="text-body-md font-mono text-text">₹{toNumber(order.totalAmount).toLocaleString('en-IN')}</p>
                  <OrderStatusBadge status={order.status} className="mt-1" />
                </div>
                <div className="sm:hidden">
                  <OrderStatusBadge status={order.status} />
                </div>
                <ChevronRight className="w-4 h-4 text-text-secondary" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

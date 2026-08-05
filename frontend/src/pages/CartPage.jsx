import { Link, useNavigate } from 'react-router-dom';
import { Minus, Plus, Trash2, ShoppingBag, ArrowRight, LayoutDashboard } from 'lucide-react';
import { useCart, useUpdateCartItem, useRemoveCartItem, useSyncCartBadge } from '../hooks/useCart';
import { useAuthStore } from '../stores/authStore';
import { FullPageSpinner } from '../components/ui/Spinner';
import Button from '../components/ui/Button';

export default function CartPage() {
  const navigate = useNavigate();
  const isAdmin = useAuthStore((s) => s.isAdmin());
  const { data: cart, isLoading } = useCart();
  const updateItem = useUpdateCartItem();
  const removeItem = useRemoveCartItem();

  useSyncCartBadge(cart);

  if (isLoading) return <FullPageSpinner />;

  if (isAdmin) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 flex flex-col items-center text-center gap-4">
        <div className="w-16 h-16 rounded-full bg-primary-light/20 flex items-center justify-center">
          <LayoutDashboard className="w-8 h-8 text-primary" />
        </div>
        <p className="text-headline-md text-text">Admin accounts can't place orders</p>
        <p className="text-body-sm text-text-secondary max-w-md">
          You're signed in as an admin. The cart and checkout are for dealers only.
          Head to the admin panel to manage orders and inventory.
        </p>
        <Button variant="accent" onClick={() => navigate('/admin')}>
          Go to Admin Dashboard
        </Button>
      </div>
    );
  }

  const items = cart?.items || [];

  if (items.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 flex flex-col items-center text-center gap-4">
        <div className="w-16 h-16 rounded-full bg-bg flex items-center justify-center">
          <ShoppingBag className="w-8 h-8 text-text-secondary" />
        </div>
        <p className="text-headline-md text-text">Your cart is empty</p>
        <p className="text-body-sm text-text-secondary">Browse the catalog to start building your order.</p>
        <Link to="/products">
          <Button variant="accent">Browse products</Button>
        </Link>
      </div>
    );
  }

  const subtotal = cart.subtotal ?? items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-6 py-6">
      <h1 className="text-headline-lg text-text mb-6">Your cart ({items.length})</h1>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 flex flex-col gap-3">
          {items.map((item) => (
            <div key={item.id} className="flex gap-4 bg-surface border border-border rounded-container p-3.5">
              <Link
                to={item.productSlug ? `/products/${item.productSlug}` : '#'}
                className="w-20 h-20 flex-shrink-0 rounded-standard overflow-hidden bg-bg"
              >
                <img src={item.thumbnail || 'https://placehold.co/200x200?text=AMK'} alt={item.productName} className="w-full h-full object-cover" />
              </Link>
              <div className="flex-1 min-w-0 flex flex-col justify-between">
                <div>
                  <Link
                    to={item.productSlug ? `/products/${item.productSlug}` : '#'}
                    className="text-body-md font-semibold text-text line-clamp-1 hover:text-primary"
                  >
                    {item.productName}
                  </Link>
                  <p className="text-body-sm text-text-secondary mt-0.5">
                    ₹{item.unitPrice.toLocaleString('en-IN')}{item.unit ? ` / ${item.unit}` : ''}
                  </p>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center border border-border rounded-standard">
                    <button
                      onClick={() => updateItem.mutate({ itemId: item.id, payload: { quantity: Math.max(item.minOrderQty || 1, item.quantity - 1) } })}
                      className="w-8 h-8 flex items-center justify-center text-text-secondary"
                      aria-label="Decrease quantity"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <input
                      type="number"
                      min={item.minOrderQty || 1}
                      defaultValue={item.quantity}
                      key={item.quantity}
                      onFocus={(e) => e.target.select()}
                      onBlur={(e) => {
                        const val = parseInt(e.target.value, 10);
                        const min = item.minOrderQty || 1;
                        if (!isNaN(val) && val >= min && val !== item.quantity) {
                          updateItem.mutate({ itemId: item.id, payload: { quantity: val } });
                        } else if (isNaN(val) || val < min) {
                          e.target.value = item.quantity;
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') e.target.blur();
                      }}
                      className="w-12 text-center text-body-sm font-mono bg-transparent outline-none border-x border-border h-8 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <button
                      onClick={() => updateItem.mutate({ itemId: item.id, payload: { quantity: item.quantity + 1 } })}
                      className="w-8 h-8 flex items-center justify-center text-text-secondary"
                      aria-label="Increase quantity"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-body-md font-mono text-text">₹{(item.unitPrice * item.quantity).toLocaleString('en-IN')}</span>
                    <button
                      onClick={() => removeItem.mutate(item.id)}
                      aria-label="Remove item"
                      className="text-text-secondary hover:text-danger"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Summary */}
        <div className="lg:col-span-1">
          <div className="bg-surface border border-border rounded-container p-5 sticky top-24">
            <h2 className="text-headline-md text-text mb-4">Order summary</h2>

            <div className="flex flex-col gap-2.5 text-body-sm mb-4">
              <div className="flex justify-between text-text-secondary">
                <span>Subtotal</span>
                <span className="font-mono text-text">₹{subtotal.toLocaleString('en-IN')}</span>
              </div>
              <p className="text-body-sm text-text-secondary">GST is calculated per item and shown at checkout.</p>
            </div>

            <Button fullWidth size="lg" variant="accent" onClick={() => navigate('/checkout')} rightIcon={<ArrowRight className="w-4 h-4" />}>
              Proceed to checkout
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

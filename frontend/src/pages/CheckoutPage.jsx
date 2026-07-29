import { useEffect, useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { MapPin, Plus, CreditCard, Check } from 'lucide-react';
import { useCart } from '../hooks/useCart';
import { useCreateOrder } from '../hooks/useOrders';
import { authApi } from '../api/auth';
import { startRazorpayCheckout } from '../api/payments';
import { useAuthStore } from '../stores/authStore';
import { useToastStore } from '../stores/toastStore';
import { apiErrorMessage } from '../api/client';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import { FullPageSpinner } from '../components/ui/Spinner';

const emptyAddress = { label: '', line1: '', line2: '', city: '', state: '', pincode: '', isDefault: false };

export default function CheckoutPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const isAdmin = useAuthStore((s) => s.isAdmin());

  // Admins cannot place orders — redirect to admin panel
  if (isAdmin) return <Navigate to="/admin" replace />;
  const { data: cart, isLoading: loadingCart } = useCart();
  const createOrder = useCreateOrder();

  const setUser = useAuthStore((s) => s.setUser);

  const [addresses, setAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [isAddingAddress, setIsAddingAddress] = useState(false);
  const [newAddress, setNewAddress] = useState(emptyAddress);
  const [loadingAddresses, setLoadingAddresses] = useState(true);
  const [buyerGstin, setBuyerGstin] = useState(user?.gstin || '');
  const [notes, setNotes] = useState('');
  const [placingOrder, setPlacingOrder] = useState(false);

  useEffect(() => {
    // Fetch fresh user profile to get latest verification status
    authApi.me().then((freshUser) => {
      if (freshUser) setUser(freshUser);
    }).catch(() => {});

    authApi
      .listAddresses()
      .then((data) => {
        setAddresses(data || []);
        const defaultAddr = data?.find((a) => a.isDefault) || data?.[0];
        if (defaultAddr) setSelectedAddressId(defaultAddr.id);
      })
      .catch(() => {})
      .finally(() => setLoadingAddresses(false));
  }, []);

  if (loadingCart || loadingAddresses) return <FullPageSpinner />;

  const items = cart?.items || [];
  const subtotal = cart?.subtotal ?? items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);

  const handleAddAddress = async (e) => {
    e.preventDefault();
    try {
      const created = await authApi.addAddress(newAddress);
      setAddresses((prev) => [...prev, created]);
      setSelectedAddressId(created.id);
      setIsAddingAddress(false);
      setNewAddress(emptyAddress);
    } catch (err) {
      useToastStore.getState().error(apiErrorMessage(err, 'Could not save this address.'));
    }
  };

  const handlePlaceOrder = () => {
    if (!selectedAddressId) {
      useToastStore.getState().warning('Select a delivery address to continue.');
      return;
    }

    setPlacingOrder(true);
    createOrder.mutate(
      { addressId: selectedAddressId, buyerGstin: buyerGstin || undefined, notes: notes || undefined },
      {
        onSuccess: (order) => {
          startRazorpayCheckout({
            orderId: order.id,
            amount: order.totalAmount,
            customer: { name: user?.name, email: user?.email, contact: user?.phone },
            onSuccess: () => {
              setPlacingOrder(false);
              useToastStore.getState().success('Payment successful! Order confirmed.');
              navigate(`/orders/${order.id}`);
            },
            onFailure: ({ message }) => {
              setPlacingOrder(false);
              useToastStore.getState().error(message || 'Payment was not completed.');
              // Still navigate to order — it's created, just payment pending
              navigate(`/orders/${order.id}`);
            },
          });
        },
        onError: () => setPlacingOrder(false),
      }
    );
  };

  // Pre-checkout: profile completeness checks (phone only — no email verification needed)
  const missingRequirements = [];
  if (!user?.phone) missingRequirements.push('Add a phone number');
  else if (!user?.phoneVerified) missingRequirements.push('Verify your phone number');
  const canPlaceOrder = missingRequirements.length === 0;

  return (
    <div className="max-w-6xl mx-auto px-4 lg:px-6 py-6">
      <h1 className="text-headline-lg text-text mb-6">Checkout</h1>

      {/* Profile completeness warning */}
      {!canPlaceOrder && (
        <div className="bg-amber-50 border border-amber-300 rounded-container p-4 mb-6 flex items-start gap-3">
          <svg className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <div>
            <p className="text-body-sm font-semibold text-amber-800 mb-1">Complete your profile to place an order</p>
            <ul className="text-body-sm text-amber-700 list-disc list-inside">
              {missingRequirements.map((req) => <li key={req}>{req}</li>)}
            </ul>
            <button onClick={() => navigate('/profile')} className="text-body-sm text-primary font-semibold mt-2 hover:underline">
              Go to Profile →
            </button>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* Address */}
          <section className="bg-surface border border-border rounded-container p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-headline-md text-text flex items-center gap-2">
                <MapPin className="w-5 h-5 text-primary" /> Delivery address
              </h2>
              <Button variant="link" size="sm" onClick={() => setIsAddingAddress(true)} leftIcon={<Plus className="w-4 h-4" />}>
                Add new
              </Button>
            </div>

            {addresses.length === 0 ? (
              <p className="text-body-sm text-text-secondary">No saved addresses. Add one to continue.</p>
            ) : (
              <div className="flex flex-col gap-2.5">
                {addresses.map((addr) => (
                  <label
                    key={addr.id}
                    className={`flex items-start gap-3 border rounded-standard p-3.5 cursor-pointer transition-colors ${
                      selectedAddressId === addr.id ? 'border-primary bg-primary-light/20' : 'border-border'
                    }`}
                  >
                    <input
                      type="radio"
                      name="address"
                      checked={selectedAddressId === addr.id}
                      onChange={() => setSelectedAddressId(addr.id)}
                      className="mt-1 accent-primary"
                    />
                    <div className="text-body-sm">
                      <p className="text-text font-medium">{addr.label}{addr.isDefault ? ' · Default' : ''}</p>
                      <p className="text-text">{addr.line1}{addr.line2 ? `, ${addr.line2}` : ''}</p>
                      <p className="text-text-secondary">{addr.city}, {addr.state} - {addr.pincode}</p>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </section>

          {/* GST + notes */}
          <section className="bg-surface border border-border rounded-container p-5">
            <h2 className="text-headline-md text-text mb-4">Billing details (optional)</h2>
            <div className="flex flex-col gap-4">
              <Input
                label="Buyer GSTIN"
                value={buyerGstin}
                onChange={(e) => setBuyerGstin(e.target.value.toUpperCase())}
                placeholder="22AAAAA0000A1Z5"
                hint="Add this for a GST-compliant invoice."
              />
              <div className="flex flex-col gap-1.5">
                <label className="text-label-md text-text">Order notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  maxLength={500}
                  placeholder="Delivery instructions, site contact, etc."
                  className="rounded-standard border border-border p-3 text-body-sm outline-none focus:border-primary resize-none"
                />
              </div>
            </div>
          </section>

          {/* Payment method */}
          <section className="bg-surface border border-border rounded-container p-5">
            <h2 className="text-headline-md text-text mb-4">Payment</h2>
            <div className="flex items-center gap-3 border border-primary bg-primary-light/20 rounded-standard p-3.5">
              <CreditCard className="w-4.5 h-4.5 text-primary" />
              <span className="text-body-sm text-text">Pay online — cards, UPI, netbanking via Razorpay</span>
            </div>
          </section>

          {/* Items review */}
          <section className="bg-surface border border-border rounded-container p-5">
            <h2 className="text-headline-md text-text mb-4">Items ({items.length})</h2>
            <div className="flex flex-col gap-3">
              {items.map((item) => (
                <div key={item.id} className="flex justify-between items-center text-body-sm">
                  <div className="flex items-center gap-3">
                    <img src={item.thumbnail || 'https://placehold.co/100x100?text=AMK'} alt="" className="w-10 h-10 rounded-standard object-cover bg-bg" />
                    <div>
                      <p className="text-text">{item.productName}</p>
                      <p className="text-text-secondary">{item.quantity} × ₹{item.unitPrice.toLocaleString('en-IN')}</p>
                    </div>
                  </div>
                  <span className="font-mono text-text">₹{(item.unitPrice * item.quantity).toLocaleString('en-IN')}</span>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Summary */}
        <div className="lg:col-span-1">
          <div className="bg-surface border border-border rounded-container p-5 sticky top-24">
            <h2 className="text-headline-md text-text mb-4">Order total</h2>
            <div className="flex flex-col gap-2.5 text-body-sm mb-4">
              <div className="flex justify-between text-text-secondary">
                <span>Subtotal</span><span className="font-mono text-text">₹{subtotal.toLocaleString('en-IN')}</span>
              </div>
              <p className="text-text-secondary">GST is calculated server-side per item's GST rate and shown on the confirmed order.</p>
            </div>
            <Button
              fullWidth
              size="lg"
              variant="accent"
              onClick={handlePlaceOrder}
              isLoading={createOrder.isPending || placingOrder}
              disabled={!canPlaceOrder}
              leftIcon={<Check className="w-4 h-4" />}
            >
              Place order &amp; pay
            </Button>
            {!canPlaceOrder && (
              <p className="text-body-sm text-text-secondary text-center mt-2">Complete your profile to enable ordering.</p>
            )}
          </div>
        </div>
      </div>

      <Modal isOpen={isAddingAddress} onClose={() => setIsAddingAddress(false)} title="Add delivery address">
        <form onSubmit={handleAddAddress} className="flex flex-col gap-4">
          <Input
            label="Label"
            required
            placeholder="e.g. Site office, Warehouse"
            value={newAddress.label}
            onChange={(e) => setNewAddress((a) => ({ ...a, label: e.target.value }))}
          />
          <Input label="Address line 1" required value={newAddress.line1} onChange={(e) => setNewAddress((a) => ({ ...a, line1: e.target.value }))} />
          <Input label="Address line 2" value={newAddress.line2} onChange={(e) => setNewAddress((a) => ({ ...a, line2: e.target.value }))} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="City" required value={newAddress.city} onChange={(e) => setNewAddress((a) => ({ ...a, city: e.target.value }))} />
            <Input label="State" required value={newAddress.state} onChange={(e) => setNewAddress((a) => ({ ...a, state: e.target.value }))} />
          </div>
          <Input label="Pincode" required value={newAddress.pincode} onChange={(e) => setNewAddress((a) => ({ ...a, pincode: e.target.value }))} />
          <label className="flex items-center gap-2 text-body-sm text-text">
            <input
              type="checkbox"
              checked={newAddress.isDefault}
              onChange={(e) => setNewAddress((a) => ({ ...a, isDefault: e.target.checked }))}
              className="accent-primary"
            />
            Set as default address
          </label>
          <Button type="submit" fullWidth>Save address</Button>
        </form>
      </Modal>
    </div>
  );
}

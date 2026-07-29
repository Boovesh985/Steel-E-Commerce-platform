import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { XCircle, MapPin, AlertTriangle, RefreshCcw } from 'lucide-react';
import { useOrder, useOrderTracking, useCancelOrder } from '../hooks/useOrders';
import OrderStatusBadge, { PaymentStatusBadge } from '../components/order/OrderStatusBadge';
import OrderTimeline from '../components/order/OrderTimeline';
import { FullPageSpinner } from '../components/ui/Spinner';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import { toNumber } from '../utils/product';

const CANCELLABLE_STATUSES = ['PENDING', 'CONFIRMED'];

export default function OrderDetailPage() {
  const { orderId } = useParams();
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  const { data: order, isLoading } = useOrder(orderId);
  const { data: trackingData } = useOrderTracking(orderId);
  // Backend returns { orderNumber, currentStatus, events } — extract the array
  const trackingEvents = Array.isArray(trackingData) ? trackingData : trackingData?.events;
  const cancelOrder = useCancelOrder();

  if (isLoading) return <FullPageSpinner />;
  if (!order) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <p className="text-headline-md text-text">Order not found</p>
        <Link to="/orders" className="text-primary text-body-sm mt-2 inline-block">Back to orders</Link>
      </div>
    );
  }

  const canCancel = CANCELLABLE_STATUSES.includes(order.status?.toUpperCase());
  const isPaid = order.paymentStatus?.toUpperCase() === 'PAID';
  const isRefunded = order.paymentStatus?.toUpperCase() === 'REFUNDED';
  const address = order.shippingAddress || {};

  const handleCancel = () => {
    cancelOrder.mutate(
      { orderId: order.id, reason: cancelReason || undefined },
      { onSuccess: () => { setCancelOpen(false); setCancelReason(''); } }
    );
  };

  return (
    <div className="max-w-4xl mx-auto px-4 lg:px-6 py-6">
      <div className="flex items-start justify-between gap-3 mb-6 flex-wrap">
        <div>
          <h1 className="text-headline-lg text-text">Order #{order.orderNumber}</h1>
          <p className="text-body-sm text-text-secondary mt-1">Placed on {new Date(order.createdAt).toLocaleDateString('en-IN')}</p>
        </div>
        <div className="flex items-center gap-2">
          <OrderStatusBadge status={order.status} />
          <PaymentStatusBadge status={order.paymentStatus} />
        </div>
      </div>

      {/* Refund banner */}
      {isRefunded && (
        <div className="flex items-start gap-3 bg-green-50 border border-green-200 rounded-container p-4 mb-6">
          <RefreshCcw className="w-5 h-5 text-green-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-label-md text-green-800">Refund initiated</p>
            <p className="text-body-sm text-green-700 mt-0.5">
              ₹{toNumber(order.totalAmount).toLocaleString('en-IN')} will be credited to your original payment method within 5–7 business days.
            </p>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* Timeline */}
          <section className="bg-surface border border-border rounded-container p-5">
            <h2 className="text-headline-md text-text mb-4">Tracking</h2>
            <OrderTimeline events={trackingEvents || order.trackingEvents || []} currentStatus={order.status} />
          </section>

          {/* Items */}
          <section className="bg-surface border border-border rounded-container p-5">
            <h2 className="text-headline-md text-text mb-4">Items</h2>
            <div className="flex flex-col gap-3">
              {order.items?.map((item) => (
                <div key={item.id} className="flex justify-between items-center text-body-sm">
                  <div>
                    <p className="text-text">{item.productName}</p>
                    <p className="text-text-secondary">{item.quantity} × ₹{toNumber(item.unitPrice).toLocaleString('en-IN')}</p>
                  </div>
                  <span className="font-mono text-text">₹{toNumber(item.subtotal).toLocaleString('en-IN')}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Address */}
          <section className="bg-surface border border-border rounded-container p-5">
            <h2 className="text-headline-md text-text mb-3 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-primary" /> Delivery address
            </h2>
            {address.label && <p className="text-body-sm text-text font-medium">{address.label}</p>}
            <p className="text-body-sm text-text">
              {address.line1}{address.line2 ? `, ${address.line2}` : ''}
            </p>
            <p className="text-body-sm text-text-secondary">
              {address.city}, {address.state} - {address.pincode}
            </p>
          </section>
        </div>

        {/* Summary + actions */}
        <div className="lg:col-span-1">
          <div className="bg-surface border border-border rounded-container p-5 sticky top-24 flex flex-col gap-4">
            <div className="flex flex-col gap-2.5 text-body-sm">
              <div className="flex justify-between text-text-secondary">
                <span>Subtotal</span><span className="font-mono text-text">₹{toNumber(order.subtotal).toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-text-secondary">
                <span>GST</span><span className="font-mono">₹{toNumber(order.gstAmount).toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between border-t border-border pt-2.5 mt-1">
                <span className="text-label-md text-text">Total</span>
                <span className="text-headline-md text-text font-mono">₹{toNumber(order.totalAmount).toLocaleString('en-IN')}</span>
              </div>
            </div>
            {order.buyerGstin && (
              <p className="text-body-sm text-text-secondary border-t border-border pt-3">Buyer GSTIN: {order.buyerGstin}</p>
            )}

            {canCancel && (
              <div className="pt-2 border-t border-border">
                <Button variant="danger" size="sm" fullWidth onClick={() => setCancelOpen(true)} leftIcon={<XCircle className="w-4 h-4" />}>
                  Cancel order
                </Button>
                {order.status?.toUpperCase() === 'PROCESSING' && (
                  <p className="text-body-sm text-text-secondary mt-2 text-center">
                    Order is being processed. Cancel now before it ships.
                  </p>
                )}
              </div>
            )}

            {order.status?.toUpperCase() === 'SHIPPED' && (
              <p className="text-body-sm text-text-secondary border-t border-border pt-3 text-center">
                Order has been shipped and can no longer be cancelled.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Cancel confirmation modal */}
      <Modal isOpen={cancelOpen} onClose={() => setCancelOpen(false)} size="sm">
        <div className="flex flex-col items-center text-center py-2">
          <div className="w-14 h-14 rounded-full bg-danger/10 flex items-center justify-center mb-4">
            <AlertTriangle className="w-7 h-7 text-danger" />
          </div>
          <h3 className="text-headline-md text-text mb-1">Cancel this order?</h3>
          <p className="text-body-sm text-text-secondary mb-4">
            This action cannot be undone.
          </p>

          {isPaid && (
            <div className="bg-blue-50 border border-blue-200 rounded-standard p-3 mb-4 w-full text-left">
              <p className="text-body-sm text-blue-800">
                <strong>Refund:</strong> ₹{toNumber(order.totalAmount).toLocaleString('en-IN')} will be refunded to your original payment method within 5–7 business days.
              </p>
            </div>
          )}

          <textarea
            className="w-full border border-border rounded-standard p-3 text-body-sm text-text mb-4 resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            placeholder="Reason for cancellation (optional)"
            rows={3}
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
          />

          <div className="flex gap-3 w-full">
            <Button variant="outline" fullWidth onClick={() => setCancelOpen(false)}>
              Keep order
            </Button>
            <Button variant="danger" fullWidth onClick={handleCancel} isLoading={cancelOrder.isPending}>
              Confirm cancellation
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

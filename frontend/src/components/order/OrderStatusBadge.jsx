import Badge from '../ui/Badge';

// Matches the backend's Prisma enums exactly (uppercase).
export const ORDER_STATUS_CONFIG = {
  PENDING: { label: 'Pending', variant: 'warning' },
  CONFIRMED: { label: 'Confirmed', variant: 'primary' },
  PROCESSING: { label: 'Processing', variant: 'warning' },
  SHIPPED: { label: 'Shipped', variant: 'primary' },
  OUT_FOR_DELIVERY: { label: 'Out for delivery', variant: 'primary' },
  DELIVERED: { label: 'Delivered', variant: 'success' },
  CANCELLED: { label: 'Cancelled', variant: 'danger' },
  RETURNED: { label: 'Returned', variant: 'danger' },
};

export const PAYMENT_STATUS_CONFIG = {
  PENDING: { label: 'Payment pending', variant: 'warning' },
  PAID: { label: 'Paid', variant: 'success' },
  FAILED: { label: 'Payment failed', variant: 'danger' },
  REFUNDED: { label: 'Refunded', variant: 'neutral' },
};

export default function OrderStatusBadge({ status, className }) {
  const config = ORDER_STATUS_CONFIG[status?.toUpperCase()] || { label: status, variant: 'neutral' };
  return (
    <Badge variant={config.variant} withDot className={className}>
      {config.label}
    </Badge>
  );
}

export function PaymentStatusBadge({ status, className }) {
  const config = PAYMENT_STATUS_CONFIG[status?.toUpperCase()] || { label: status, variant: 'neutral' };
  return (
    <Badge variant={config.variant} withDot className={className}>
      {config.label}
    </Badge>
  );
}

import { CheckCircle2, PackageSearch, Truck, MapPin, XCircle, RotateCcw, Circle } from 'lucide-react';
import clsx from 'clsx';
import { ORDER_STATUS_CONFIG } from './OrderStatusBadge';

const statusIcons = {
  PENDING: Circle,
  CONFIRMED: CheckCircle2,
  PROCESSING: PackageSearch,
  SHIPPED: Truck,
  OUT_FOR_DELIVERY: MapPin,
  DELIVERED: CheckCircle2,
  CANCELLED: XCircle,
  RETURNED: RotateCcw,
};

/**
 * Renders the backend's raw TrackingEvent[] log (status, note, location,
 * timestamp) as a chronological timeline — rather than assuming a fixed
 * sequence of steps, since the backend can log any status transition
 * (including CANCELLED/RETURNED at any point) with optional notes.
 */
export default function OrderTimeline({ events = [], currentStatus }) {
  // Most-recent-first from the API is common; display oldest-first like a real timeline.
  const sorted = [...events].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

  if (sorted.length === 0) {
    return <p className="text-body-sm text-text-secondary">No tracking updates yet.</p>;
  }

  return (
    <ol className="flex flex-col">
      {sorted.map((event, idx) => {
        const isLast = idx === sorted.length - 1;
        const config = ORDER_STATUS_CONFIG[event.status?.toUpperCase()] || { label: event.status, variant: 'neutral' };
        const Icon = statusIcons[event.status?.toUpperCase()] || Circle;
        const isCurrent = !isLast || event.status?.toUpperCase() === currentStatus?.toUpperCase();

        const dotColor = {
          success: 'bg-success border-success text-white',
          warning: 'bg-warning border-warning text-white',
          danger: 'bg-danger border-danger text-white',
          primary: 'bg-primary border-primary text-white',
          neutral: 'bg-surface border-border text-text-secondary',
        }[config.variant];

        return (
          <li key={event.id || idx} className="flex gap-4">
            <div className="flex flex-col items-center">
              <div className={clsx('w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 border-2', dotColor)}>
                <Icon className="w-4 h-4" />
              </div>
              {!isLast && <div className="w-0.5 flex-1 min-h-[32px] bg-border" />}
            </div>
            <div className={clsx('pb-8', isCurrent && 'font-semibold')}>
              <p className="text-body-md text-text">{config.label}</p>
              {event.timestamp && (
                <p className="text-body-sm text-text-secondary mt-0.5">{new Date(event.timestamp).toLocaleString('en-IN')}</p>
              )}
              {event.location && <p className="text-body-sm text-text-secondary">{event.location}</p>}
              {event.note && <p className="text-body-sm text-text-secondary mt-1">{event.note}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

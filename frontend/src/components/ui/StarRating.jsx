import { useState } from 'react';
import { Star } from 'lucide-react';
import clsx from 'clsx';

const sizes = {
  sm: 'w-3.5 h-3.5',
  md: 'w-5 h-5',
  lg: 'w-7 h-7',
};

export default function StarRating({ value = 0, onChange, size = 'md', readOnly = true, count, className }) {
  const [hovered, setHovered] = useState(null);
  const isInteractive = !readOnly && typeof onChange === 'function';
  const displayValue = hovered ?? value;

  return (
    <div className={clsx('inline-flex items-center gap-1', className)}>
      <div className="inline-flex" onMouseLeave={() => setHovered(null)}>
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            disabled={!isInteractive}
            onClick={() => onChange?.(star)}
            onMouseEnter={() => isInteractive && setHovered(star)}
            aria-label={`${star} star${star > 1 ? 's' : ''}`}
            className={clsx(!isInteractive && 'cursor-default', 'p-0.5')}
          >
            <Star
              className={clsx(
                sizes[size],
                star <= Math.round(displayValue) ? 'fill-accent text-accent' : 'fill-none text-border'
              )}
              strokeWidth={1.5}
            />
          </button>
        ))}
      </div>
      {typeof count === 'number' && (
        <span className="text-body-sm text-text-secondary ml-1">({count})</span>
      )}
    </div>
  );
}

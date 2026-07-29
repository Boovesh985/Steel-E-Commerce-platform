import { Loader2 } from 'lucide-react';
import clsx from 'clsx';

const sizes = {
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-9 h-9',
};

export default function Spinner({ size = 'md', className, label = 'Loading' }) {
  return (
    <div role="status" className="inline-flex items-center justify-center">
      <Loader2 className={clsx('animate-spin text-primary', sizes[size], className)} />
      <span className="sr-only">{label}</span>
    </div>
  );
}

export function FullPageSpinner() {
  return (
    <div className="flex items-center justify-center min-h-[50vh] w-full">
      <Spinner size="lg" />
    </div>
  );
}

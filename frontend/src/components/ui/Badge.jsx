import clsx from 'clsx';

const variants = {
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
  danger: 'bg-danger/10 text-danger',
  primary: 'bg-primary-light text-primary-dark',
  neutral: 'bg-border/60 text-text-secondary',
  accent: 'bg-accent/10 text-accent-dark',
};

const dotColors = {
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
  primary: 'bg-primary',
  neutral: 'bg-text-secondary',
  accent: 'bg-accent',
};

export default function Badge({ children, variant = 'neutral', withDot = false, className }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-standard text-label-sm',
        variants[variant],
        className
      )}
    >
      {withDot && <span className={clsx('w-1.5 h-1.5 rounded-full', dotColors[variant])} />}
      {children}
    </span>
  );
}

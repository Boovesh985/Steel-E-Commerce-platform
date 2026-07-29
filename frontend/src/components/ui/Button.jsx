import { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';
import clsx from 'clsx';

const variants = {
  primary: 'relative overflow-hidden btn-sheen bg-primary text-white hover:bg-primary-dark hover:-translate-y-0.5 hover:shadow-lift active:scale-[0.98] active:translate-y-0',
  accent: 'relative overflow-hidden btn-sheen bg-accent text-white hover:bg-accent-dark hover:-translate-y-0.5 hover:shadow-lift active:scale-[0.98] active:translate-y-0',
  outline: 'bg-transparent border border-border text-text hover:bg-bg hover:border-primary active:scale-[0.98]',
  ghost: 'bg-transparent text-text hover:bg-bg active:scale-[0.98]',
  danger: 'bg-danger text-white hover:bg-red-700 active:scale-[0.98]',
  link: 'bg-transparent text-primary hover:text-primary-dark underline-offset-4 hover:underline p-0',
};

const sizes = {
  sm: 'h-9 px-3 text-body-sm rounded-standard',
  md: 'h-11 px-5 text-body-md rounded-standard',
  lg: 'h-13 px-6 text-body-lg rounded-standard',
};

const Button = forwardRef(
  (
    {
      variant = 'primary',
      size = 'md',
      className,
      children,
      isLoading = false,
      leftIcon,
      rightIcon,
      fullWidth = false,
      disabled,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={clsx(
          'inline-flex items-center justify-center gap-2 font-semibold transition-all duration-200',
          'disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100',
          variant !== 'link' && sizes[size],
          variants[variant],
          fullWidth && 'w-full',
          className
        )}
        {...props}
      >
        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : leftIcon}
        {children}
        {!isLoading && rightIcon}
      </button>
    );
  }
);

Button.displayName = 'Button';
export default Button;

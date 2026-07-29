import { forwardRef, useId, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import clsx from 'clsx';

const Input = forwardRef(
  ({ label, error, hint, leftIcon, rightIcon, className, containerClassName, id, type, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id || generatedId;

    const isPassword = type === 'password';
    const [showPassword, setShowPassword] = useState(false);

    // Determine the actual input type — toggle between text/password
    const inputType = isPassword ? (showPassword ? 'text' : 'password') : type;

    // Password toggle button takes priority over rightIcon for password fields
    const passwordToggle = isPassword ? (
      <button
        type="button"
        onClick={() => setShowPassword((v) => !v)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text transition-colors p-0.5 -m-0.5"
        aria-label={showPassword ? 'Hide password' : 'Show password'}
        tabIndex={-1}
      >
        {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
      </button>
    ) : null;

    const hasRightElement = isPassword || rightIcon;

    return (
      <div className={clsx('flex flex-col gap-1.5', containerClassName)}>
        {label && (
          <label htmlFor={inputId} className="text-label-md text-text">
            {label}
            {props.required && <span className="text-danger ml-0.5">*</span>}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary">{leftIcon}</span>
          )}
          <input
            ref={ref}
            id={inputId}
            type={inputType}
            aria-invalid={!!error}
            aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
            className={clsx(
              'w-full h-11 rounded-standard border bg-surface text-body-md text-text placeholder:text-text-secondary',
              'transition-colors duration-150 outline-none',
              leftIcon ? 'pl-10' : 'pl-3',
              hasRightElement ? 'pr-10' : 'pr-3',
              error
                ? 'border-danger focus:border-danger'
                : 'border-border focus:border-primary',
              className
            )}
            {...props}
          />
          {passwordToggle || (rightIcon && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary">{rightIcon}</span>
          ))}
        </div>
        {error && (
          <span id={`${inputId}-error`} className="text-body-sm text-danger">
            {error}
          </span>
        )}
        {!error && hint && (
          <span id={`${inputId}-hint`} className="text-body-sm text-text-secondary">
            {hint}
          </span>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
export default Input;

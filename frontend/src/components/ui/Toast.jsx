import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import { useToastStore } from '../../stores/toastStore';

const icons = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

const accentColors = {
  success: 'border-l-success',
  error: 'border-l-danger',
  warning: 'border-l-warning',
  info: 'border-l-primary',
};

const iconColors = {
  success: 'text-success',
  error: 'text-danger',
  warning: 'text-warning',
  info: 'text-primary',
};

export default function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);
  const dismissToast = useToastStore((s) => s.dismissToast);

  return (
    <div className="fixed right-4 left-4 sm:left-auto z-[100] flex flex-col gap-2 w-auto sm:w-96" style={{ top: 'calc(env(safe-area-inset-top, 0px) + 1rem)' }}>
      <AnimatePresence initial={false}>
        {toasts.map((toast) => {
          const Icon = icons[toast.type] || Info;
          return (
            <motion.div
              key={toast.id}
              role="alert"
              layout
              initial={{ opacity: 0, y: -8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 32, transition: { duration: 0.15 } }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className={clsx(
                'flex items-start gap-3 bg-surface border border-border border-l-4 rounded-standard shadow-lift p-4',
                accentColors[toast.type]
              )}
            >
              <Icon className={clsx('w-5 h-5 flex-shrink-0 mt-0.5', iconColors[toast.type])} />
              <div className="flex-1 min-w-0">
                {toast.title && <p className="text-label-md text-text">{toast.title}</p>}
                {toast.message && <p className="text-body-sm text-text-secondary mt-0.5">{toast.message}</p>}
              </div>
              <button
                onClick={() => dismissToast(toast.id)}
                aria-label="Dismiss notification"
                className="text-text-secondary hover:text-text flex-shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

import clsx from 'clsx';
import { AlertCircle, AlertTriangle, CheckCircle, Info, X } from 'lucide-react';
import { useEffect } from 'react';

export type ToastVariant = 'default' | 'success' | 'error' | 'warning' | 'info';

const VARIANT_STYLES: Record<ToastVariant, { container: string; icon: React.ReactNode }> = {
  default: {
    container: 'border-slate-200 bg-white text-slate-900',
    icon: null,
  },
  success: {
    container: 'border-emerald-200 bg-emerald-50 text-emerald-900',
    icon: <CheckCircle size={18} className="shrink-0 text-emerald-600" />,
  },
  error: {
    container: 'border-red-200 bg-red-50 text-red-900',
    icon: <AlertCircle size={18} className="shrink-0 text-red-600" />,
  },
  warning: {
    container: 'border-amber-200 bg-amber-50 text-amber-900',
    icon: <AlertTriangle size={18} className="shrink-0 text-amber-600" />,
  },
  info: {
    container: 'border-blue-200 bg-blue-50 text-blue-900',
    icon: <Info size={18} className="shrink-0 text-blue-600" />,
  },
};

export function Toast({
  message,
  onClose,
  variant = 'default',
  timeoutMs = 2500,
  dismissible = true,
}: {
  message: string;
  onClose: () => void;
  variant?: ToastVariant;
  timeoutMs?: number;
  dismissible?: boolean;
}) {
  useEffect(() => {
    if (timeoutMs <= 0) return;
    const t = window.setTimeout(onClose, timeoutMs);
    return () => window.clearTimeout(t);
  }, [onClose, timeoutMs]);

  const styles = VARIANT_STYLES[variant];

  return (
    <div
      className={clsx(
        'fixed bottom-4 right-4 z-[100] flex max-w-sm items-start gap-2 rounded-lg border px-3 py-2 text-sm shadow-lg',
        styles.container,
      )}
      role="alert"
    >
      {styles.icon}
      <div className="flex-1">{message}</div>
      {dismissible ? (
        <button
          type="button"
          className="shrink-0 rounded p-0.5 opacity-60 transition hover:opacity-100"
          onClick={onClose}
          aria-label="Dismiss"
        >
          <X size={16} />
        </button>
      ) : null}
    </div>
  );
}

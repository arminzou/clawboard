import clsx from 'clsx';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';
import { toast, useToasts } from '../../../lib/toast';

export function ToastContainer() {
  const toasts = useToasts();

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={clsx(
            'flex items-center gap-3 rounded-xl border px-4 py-3 shadow-lg animate-in fade-in slide-in-from-right-4 duration-300',
            {
              'border-emerald-200 bg-emerald-50 text-emerald-900': t.type === 'success',
              'border-red-200 bg-red-50 text-red-900': t.type === 'error',
              'border-amber-200 bg-amber-50 text-amber-900': t.type === 'warning',
              'border-blue-200 bg-blue-50 text-blue-900': t.type === 'info',
            }
          )}
        >
          <span className="shrink-0">
            {t.type === 'success' && <CheckCircle2 size={18} className="text-emerald-500" />}
            {t.type === 'error' && <AlertCircle size={18} className="text-red-500" />}
            {t.type === 'warning' && <AlertTriangle size={18} className="text-amber-500" />}
            {t.type === 'info' && <Info size={18} className="text-blue-500" />}
          </span>
          <span className="text-sm font-medium">{t.message}</span>
          <button
            onClick={() => toast.dismiss(t.id)}
            className="ml-2 rounded-lg p-1 transition-colors hover:bg-black/5"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}

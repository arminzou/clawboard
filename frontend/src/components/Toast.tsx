import { useEffect } from 'react';

export function Toast({
  message,
  onClose,
  timeoutMs = 2500,
}: {
  message: string;
  onClose: () => void;
  timeoutMs?: number;
}) {
  useEffect(() => {
    const t = window.setTimeout(onClose, timeoutMs);
    return () => window.clearTimeout(t);
  }, [onClose, timeoutMs]);

  return (
    <div className="fixed bottom-4 right-4 z-[100] max-w-sm rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-lg">
      {message}
    </div>
  );
}

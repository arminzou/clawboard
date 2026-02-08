import { useEffect, useRef } from 'react';
import { Button } from './Button';
import { Panel } from './Panel';

export function ConfirmModal({
  title,
  message,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  variant = 'danger',
  onConfirm,
  onClose,
}: {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'primary';
  onConfirm: () => void | Promise<void>;
  onClose: () => void;
}) {
  const confirmRef = useRef<HTMLButtonElement | null>(null);

  // Focus the cancel button on mount for safety, and trap Escape key
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        onMouseDown={(e) => e.stopPropagation()}
        className="w-full max-w-sm"
        style={{ animation: 'modal-pop 0.15s ease-out' }}
      >
        <style>{`
          @keyframes modal-pop {
            from {
              opacity: 0;
              transform: scale(0.95);
            }
            to {
              opacity: 1;
              transform: scale(1);
            }
          }
        `}</style>
        <Panel className="p-6 shadow-xl">
          <div className="flex flex-col items-center text-center">
            {variant === 'danger' && (
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-red-600">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="h-7 w-7"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
                  />
                </svg>
              </div>
            )}

            <h3 className="text-lg font-bold text-[rgb(var(--cb-text))]">{title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-[rgb(var(--cb-text-muted))]">{message}</p>

            <div className="mt-6 flex w-full gap-3">
              <Button variant="secondary" className="flex-1" onClick={onClose}>
                {cancelLabel}
              </Button>
              <Button
                ref={confirmRef}
                variant={variant === 'danger' ? 'danger' : 'primary'}
                className="flex-1"
                onClick={() => {
                  onConfirm();
                }}
              >
                {confirmLabel}
              </Button>
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
}

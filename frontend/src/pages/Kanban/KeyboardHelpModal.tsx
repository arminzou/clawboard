import { useEffect, useRef } from 'react';
import { Button } from '../../components/ui/Button';
import { Panel } from '../../components/ui/Panel';

const SHORTCUTS = [
  { key: 'n', description: 'Create new task' },
  { key: '/', description: 'Focus search' },
  { key: 'Esc', description: 'Clear selection / close modal' },
  { key: '?', description: 'Show this help' },
];

function ModalOverlay({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="presentation"
    >
      {children}
    </div>
  );
}

export function KeyboardHelpModal({ onClose }: { onClose: () => void }) {
  const modalRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  // Focus trap (simplified)
  useEffect(() => {
    const el = modalRef.current;
    if (!el) return;
    el.focus();
  }, []);

  return (
    <ModalOverlay onClose={onClose}>
      <div
        ref={modalRef}
        tabIndex={-1}
        onMouseDown={(e) => e.stopPropagation()}
        className="w-full max-w-sm outline-none"
      >
        <Panel
          role="dialog"
          aria-modal="true"
          aria-label="Keyboard shortcuts"
          className="w-full p-4 shadow-[var(--cb-shadow-md)]"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="text-base font-semibold text-[rgb(var(--cb-text))]">
              Keyboard Shortcuts
            </div>
            <Button variant="ghost" size="sm" className="px-2" onClick={onClose} aria-label="Close">
              ✕
            </Button>
          </div>

          <div className="mt-4 flex flex-col gap-2">
            {SHORTCUTS.map(({ key, description }) => (
              <div key={key} className="flex items-center justify-between gap-3">
                <span className="text-sm text-[rgb(var(--cb-text))]">{description}</span>
                <kbd className="rounded border border-[rgb(var(--cb-border))] bg-[rgb(var(--cb-surface-muted))] px-2 py-0.5 font-mono text-xs text-[rgb(var(--cb-text-muted))]">
                  {key}
                </kbd>
              </div>
            ))}
          </div>

          <div className="mt-4 text-center text-xs text-[rgb(var(--cb-text-muted))]">
            Press Esc or click outside to close
          </div>
        </Panel>
      </div>
    </ModalOverlay>
  );
}

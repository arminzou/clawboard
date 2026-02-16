import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Panel } from './Panel';

export function ModalShell({
  children,
  onClose,
  maxWidthClass = 'max-w-sm',
  panelClassName = 'p-6 shadow-xl',
  overlayClassName = 'bg-black/50',
}: {
  children: ReactNode;
  onClose: () => void;
  maxWidthClass?: string;
  panelClassName?: string;
  overlayClassName?: string;
}) {
  return createPortal(
    <div
      className={`fixed inset-0 z-[60] flex items-center justify-center ${overlayClassName} p-4`}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div onMouseDown={(e) => e.stopPropagation()} className={`w-full ${maxWidthClass} cb-modal-pop`}>
        <Panel className={panelClassName}>{children}</Panel>
      </div>
    </div>,
    document.body,
  );
}

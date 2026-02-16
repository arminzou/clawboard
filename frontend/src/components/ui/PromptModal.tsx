import { useEffect, useRef, useState } from 'react';
import type { InputHTMLAttributes, ReactNode } from 'react';
import { Button } from './Button';
import { Input } from './Input';
import { ModalShell } from './ModalShell';

export function PromptModal({
  title,
  message,
  defaultValue = '',
  placeholder,
  confirmLabel = 'Save',
  cancelLabel = 'Cancel',
  variant = 'primary',
  helper,
  onConfirm,
  onClose,
  inputProps,
}: {
  title: string;
  message?: string;
  defaultValue?: string;
  placeholder?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'primary' | 'danger';
  helper?: ReactNode;
  onConfirm: (value: string) => void | Promise<void>;
  onClose: () => void;
  inputProps?: Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'placeholder'>;
}) {
  const [value, setValue] = useState(defaultValue);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        const trimmed = value.trim();
        if (!trimmed) return;
        onConfirm(trimmed);
      }
    }

    window.addEventListener('keydown', onKeyDown);
    queueMicrotask(() => inputRef.current?.focus());
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose, onConfirm, value]);

  return (
    <ModalShell onClose={onClose}>
      <div className="text-left">
        <h3 className="text-lg font-bold text-[rgb(var(--cb-text))]">{title}</h3>
        {message ? <p className="mt-2 text-sm leading-relaxed text-[rgb(var(--cb-text-muted))]">{message}</p> : null}

        <Input
          ref={inputRef}
          className="mt-4"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          {...inputProps}
        />
        {helper ? <div className="mt-2 text-xs text-[rgb(var(--cb-text-muted))]">{helper}</div> : null}

        <div className="mt-6 flex w-full gap-3">
          <Button variant="secondary" className="flex-1" onClick={onClose}>
            {cancelLabel}
          </Button>
          <Button
            variant={variant === 'danger' ? 'danger' : 'primary'}
            className="flex-1"
            disabled={!value.trim()}
            onClick={() => onConfirm(value.trim())}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </ModalShell>
  );
}

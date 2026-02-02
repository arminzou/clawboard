import { useEffect, useRef, useState } from 'react';
import { api } from '../lib/api';

export type ApiHealthState = {
  ok: boolean;
  checking: boolean;
  lastOkAt?: string;
  error?: string;
};

export function useHealth(pollMs: number = 10_000) {
  const [state, setState] = useState<ApiHealthState>({ ok: false, checking: true });
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      if (cancelled) return;
      setState((s) => ({ ...s, checking: true }));
      try {
        const res = await api.health();
        if (cancelled) return;
        setState({ ok: true, checking: false, lastOkAt: res.timestamp });
      } catch (err) {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : String(err);
        setState((prev) => ({ ok: false, checking: false, lastOkAt: prev.lastOkAt, error: msg }));
      }
    }

    function schedule() {
      if (timerRef.current != null) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(async () => {
        await check();
        schedule();
      }, pollMs);
    }

    check();
    schedule();

    return () => {
      cancelled = true;
      if (timerRef.current != null) window.clearTimeout(timerRef.current);
    };
  }, [pollMs]);

  return state;
}

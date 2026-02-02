import { useEffect, useMemo, useRef, useState } from 'react';

export type WsMessage = { type: string; data?: any };
export type WsStatus = 'connecting' | 'connected' | 'reconnecting' | 'disconnected';

const DEFAULT_WS_BASE = (() => {
  if (typeof window === 'undefined') return 'ws://localhost:3001/ws';
  const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
  return `${protocol}://${window.location.host}/ws`;
})();

const WS_BASE = (import.meta as any).env?.VITE_WS_BASE ?? DEFAULT_WS_BASE;

export function useWebSocket() {
  const [status, setStatus] = useState<WsStatus>('connecting');
  const [lastMessage, setLastMessage] = useState<WsMessage | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);
  const attemptRef = useRef(0);
  const everConnectedRef = useRef(false);

  const url = useMemo(() => WS_BASE, []);

  useEffect(() => {
    let cancelled = false;

    function clearReconnectTimer() {
      if (reconnectTimerRef.current != null) {
        window.clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
    }

    function connect(nextStatus: WsStatus) {
      if (cancelled) return;
      clearReconnectTimer();

      setStatus(nextStatus);

      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        everConnectedRef.current = true;
        attemptRef.current = 0;
        setStatus('connected');
      };

      ws.onclose = () => {
        if (cancelled) return;

        // If we ever had a successful connection, treat subsequent connects as "reconnecting".
        setStatus(everConnectedRef.current ? 'reconnecting' : 'disconnected');

        attemptRef.current += 1;
        const backoffMs = Math.min(5000, 500 * Math.max(1, attemptRef.current));
        reconnectTimerRef.current = window.setTimeout(() => connect('reconnecting'), backoffMs);
      };

      ws.onerror = () => {
        if (cancelled) return;
        // onclose will also fire; keep UI conservative.
        setStatus((s) => (s === 'connected' ? 'reconnecting' : s));
      };

      ws.onmessage = (evt) => {
        try {
          const msg = JSON.parse(evt.data);
          setLastMessage(msg);
        } catch {
          // ignore
        }
      };
    }

    connect('connecting');

    return () => {
      cancelled = true;
      clearReconnectTimer();
      try {
        wsRef.current?.close();
      } catch {
        // ignore
      }
      wsRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);

  return { status, connected: status === 'connected', lastMessage, ws: wsRef.current };
}

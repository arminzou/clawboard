import { useMemo } from 'react';
import type { WsStatus } from '../../hooks/useWebSocket';

function statusLabel(status: WsStatus): string {
  if (status === 'connected') return 'Connected';
  if (status === 'reconnecting') return 'Reconnecting';
  if (status === 'connecting') return 'Connecting';
  return 'Offline';
}

function statusDotClass(status: WsStatus): string {
  if (status === 'connected') return 'bg-emerald-500';
  if (status === 'reconnecting') return 'bg-amber-500';
  if (status === 'connecting') return 'bg-sky-500';
  return 'bg-rose-500';
}

function formatLastReceived(lastReceivedAt: number | null): string {
  if (lastReceivedAt == null) return 'No messages yet';
  const deltaSeconds = Math.max(0, Math.floor((Date.now() - lastReceivedAt) / 1000));
  if (deltaSeconds < 5) return 'Just now';
  if (deltaSeconds < 60) return `${deltaSeconds}s ago`;
  const deltaMinutes = Math.floor(deltaSeconds / 60);
  if (deltaMinutes < 60) return `${deltaMinutes}m ago`;
  return new Date(lastReceivedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function WebSocketStatusIndicator({
  status,
  reconnectAttempts,
  lastReceivedAt,
  onReconnect,
}: {
  status: WsStatus;
  reconnectAttempts: number;
  lastReceivedAt: number | null;
  onReconnect: () => void;
}) {
  const label = statusLabel(status);
  const dotClass = statusDotClass(status);
  const lastReceivedText = useMemo(() => formatLastReceived(lastReceivedAt), [lastReceivedAt]);
  const showIssueBanner = status === 'reconnecting' || status === 'disconnected';

  return (
    <>
      {showIssueBanner ? (
        <div className="fixed left-1/2 top-3 z-50 w-[min(92vw,34rem)] -translate-x-1/2 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="font-semibold">Live updates interrupted</div>
              <div className="truncate text-[11px] text-amber-800">
                {status === 'reconnecting'
                  ? `Attempt ${Math.max(1, reconnectAttempts)} in progress`
                  : 'WebSocket is disconnected'}
              </div>
            </div>
            <button
              type="button"
              onClick={onReconnect}
              className="shrink-0 rounded-md border border-amber-400 bg-white px-2 py-1 text-[11px] font-semibold text-amber-900 hover:bg-amber-100"
            >
              Retry now
            </button>
          </div>
        </div>
      ) : null}

      <div className="fixed right-3 top-3 z-50">
        <details className="group relative">
          <summary className="list-none rounded-full border border-slate-300 bg-white/90 px-3 py-1 text-[11px] font-semibold text-slate-700 shadow-sm backdrop-blur hover:bg-white">
            <span className="inline-flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${dotClass}`} />
              <span>{label}</span>
            </span>
          </summary>
          <div className="absolute right-0 mt-2 w-64 rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-700 shadow-lg">
            <div className="mb-2 font-semibold text-slate-800">WebSocket status</div>
            <div className="space-y-1">
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-500">State</span>
                <span>{label}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-500">Retry attempts</span>
                <span>{reconnectAttempts}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-500">Last message</span>
                <span>{lastReceivedText}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={onReconnect}
              className="mt-3 w-full rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Reconnect
            </button>
          </div>
        </details>
      </div>
    </>
  );
}

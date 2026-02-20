import { useCallback, useRef, type WheelEvent } from 'react';
import clsx from 'clsx';
import { AgentTamagotchi } from './AgentTamagotchi';
import { useAgentPresence } from './AgentPresenceContext';

function toPixels(delta: number, deltaMode: number, viewportWidth: number): number {
  if (deltaMode === 1) return delta * 16;
  if (deltaMode === 2) return delta * Math.max(1, viewportWidth * 0.9);
  return delta;
}

export function AgentArcadePanel({
  compact = false,
  mobileGrid = false,
  horizontal = false,
  hideHeader = false,
}: {
  compact?: boolean;
  mobileGrid?: boolean;
  horizontal?: boolean;
  hideHeader?: boolean;
}) {
  const { agentIds } = useAgentPresence();
  const horizontalRowRef = useRef<HTMLDivElement | null>(null);

  const handleHorizontalWheel = useCallback((event: WheelEvent<HTMLElement>) => {
    if (!horizontal) return;

    const el = horizontalRowRef.current;
    if (!el) return;
    if (el.scrollWidth <= el.clientWidth) return;

    // Map vertical mouse wheel to horizontal movement for desktop usability.
    if (Math.abs(event.deltaY) > Math.abs(event.deltaX)) {
      const rawDelta = toPixels(event.deltaY, event.deltaMode, el.clientWidth);
      const scaledDelta = rawDelta * 1.35;
      const maxScrollLeft = Math.max(0, el.scrollWidth - el.clientWidth);
      const prev = el.scrollLeft;
      const next = Math.max(0, Math.min(maxScrollLeft, prev + scaledDelta));
      if (Math.abs(next - prev) > 0.5) {
        el.scrollLeft = next;
        event.preventDefault();
      }
    }
  }, [horizontal]);

  return (
    <section
      onWheel={horizontal ? handleHorizontalWheel : undefined}
      className={clsx(
        'min-w-0 w-full max-w-full rounded-2xl border border-slate-700/80 bg-[radial-gradient(circle_at_top,rgb(59_130_246_/_0.18),transparent_58%),radial-gradient(circle_at_90%_90%,rgb(245_158_11_/_0.14),transparent_48%),rgb(15_23_42)] shadow-lg',
        compact ? 'p-2' : 'p-3',
        horizontal ? 'overflow-hidden' : '',
        compact ? 'overflow-hidden' : '',
        compact ? 'mx-2 mt-2' : '',
      )}
    >
      {!hideHeader && (
        <div className="mb-2">
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-300">Agent Arcade</div>
          <div className="text-xs text-slate-400">Live companion status</div>
        </div>
      )}

      {!agentIds.length ? (
        <div className="rounded-lg border border-slate-700/60 bg-slate-900/30 px-3 py-2 text-xs text-slate-300">
          Waiting for agent discovery...
        </div>
      ) : null}

      {agentIds.length ? (
        <div
          ref={horizontal ? horizontalRowRef : undefined}
          className={clsx(
            mobileGrid
              ? 'grid grid-cols-2 gap-2'
              : horizontal
                ? 'cb-scrollbar-hidden touch-pan-x min-w-0 w-full max-w-full flex gap-2 overflow-x-auto overflow-y-hidden pb-1'
                : compact
                  ? 'cb-scrollbar-hidden min-w-0 w-full max-w-full flex gap-2 overflow-x-auto overflow-y-hidden pb-1'
                  : 'flex flex-col gap-2',
          )}
        >
          {agentIds.map((id) => (
            <AgentTamagotchi
              key={id}
              agentId={id}
              compact={compact}
              slot={horizontal}
              className={mobileGrid ? 'min-w-0' : undefined}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}

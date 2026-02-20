import clsx from 'clsx';
import { AgentTamagotchi } from './AgentTamagotchi';

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
  return (
    <section
      className={clsx(
        'rounded-2xl border border-slate-700/80 bg-[radial-gradient(circle_at_top,rgb(59_130_246_/_0.18),transparent_58%),radial-gradient(circle_at_90%_90%,rgb(245_158_11_/_0.14),transparent_48%),rgb(15_23_42)] shadow-lg',
        compact ? 'p-2' : 'p-3',
        compact ? 'mx-2 mt-2' : '',
      )}
    >
      {!hideHeader && (
        <div className="mb-2">
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-300">Agent Arcade</div>
          <div className="text-xs text-slate-400">Live companion status</div>
        </div>
      )}

      <div
        className={clsx(
          mobileGrid
            ? 'grid grid-cols-2 gap-2'
            : horizontal
              ? 'cb-scrollbar-hidden flex snap-x snap-mandatory gap-2 overflow-x-auto pb-1'
            : compact
              ? 'cb-scrollbar-hidden flex gap-2 overflow-x-auto pb-1'
              : 'flex flex-col gap-2',
        )}
      >
        <AgentTamagotchi
          agentId="tee"
          compact={compact}
          slot={horizontal}
          className={mobileGrid ? 'min-w-0' : undefined}
        />
        <AgentTamagotchi
          agentId="fay"
          compact={compact}
          slot={horizontal}
          className={mobileGrid ? 'min-w-0' : undefined}
        />
      </div>
    </section>
  );
}

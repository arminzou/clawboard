import clsx from 'clsx';
import type { AgentStatus } from './AgentPresenceContext';

const STATUS_DOT_CLASS: Record<AgentStatus, string> = {
  thinking: 'bg-amber-400',
  idle: 'bg-emerald-400',
  offline: 'bg-slate-400',
};
const STATUS_DOT_GLOW_CLASS: Record<AgentStatus, string> = {
  thinking: 'shadow-[0_0_0_2px_rgb(251_191_36/0.35),0_0_12px_rgb(251_191_36/0.55)]',
  idle: 'shadow-[0_0_0_2px_rgb(52_211_153/0.32),0_0_12px_rgb(52_211_153/0.48)]',
  offline: 'shadow-[0_0_0_2px_rgb(148_163_184/0.24),0_0_10px_rgb(148_163_184/0.32)]',
};

const AVATAR_SIZE_CLASS = 'h-10 w-10 text-2xl';
const DOT_SIZE_CLASS = 'h-4 w-4';

export function AgentPresenceAvatar({
  avatar,
  status,
  highlightStatus = false,
  className,
}: {
  avatar: string;
  status: AgentStatus;
  highlightStatus?: boolean;
  className?: string;
}) {
  return (
    <span
      className={clsx(
        'relative inline-flex shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white',
        AVATAR_SIZE_CLASS,
        className,
      )}
      aria-hidden
    >
      <span className="leading-none">{avatar}</span>
      <span
        className={clsx(
          'absolute -bottom-1 -right-1 rounded-full border-2 border-white shadow-[0_0_0_1px_rgb(15_23_42/0.14)]',
          DOT_SIZE_CLASS,
          STATUS_DOT_CLASS[status],
          highlightStatus ? STATUS_DOT_GLOW_CLASS[status] : null,
        )}
      />
    </span>
  );
}

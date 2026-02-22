import clsx from 'clsx';
import type { AgentStatus } from './AgentPresenceContext';

const STATUS_DOT_CLASS: Record<AgentStatus, string> = {
  thinking: 'bg-amber-400',
  idle: 'bg-emerald-400',
  offline: 'bg-slate-400',
};

const AVATAR_SIZE_CLASS = 'h-10 w-10 text-2xl';
const DOT_SIZE_CLASS = 'h-4 w-4';

export function AgentPresenceAvatar({
  avatar,
  status,
  className,
}: {
  avatar: string;
  status: AgentStatus;
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
        )}
      />
    </span>
  );
}


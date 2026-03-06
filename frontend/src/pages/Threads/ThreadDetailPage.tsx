import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, type PromotionPacket, type QuestionThread, type ThreadEvent, type ThreadStatus } from '../../lib/api';
import { defaults } from '../../lib/features';

/* ── helpers ─────────────────────────────────────────── */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-[rgb(var(--cb-border))] bg-[rgb(var(--cb-card))] p-4">
      <div className="text-sm font-semibold text-[rgb(var(--cb-text))]">{title}</div>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function Btn({
  children,
  onClick,
  disabled,
  variant = 'default',
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  variant?: 'default' | 'primary' | 'danger';
}) {
  const base = 'rounded-md px-3 py-1.5 text-xs font-medium transition disabled:opacity-40';
  const variants: Record<string, string> = {
    default: 'border border-[rgb(var(--cb-border))] text-[rgb(var(--cb-text-muted))] hover:bg-[rgb(var(--cb-hover))]',
    primary: 'bg-[rgb(var(--cb-accent))] text-white hover:opacity-90',
    danger: 'border border-red-500/30 text-red-400 hover:bg-red-500/10',
  };
  return (
    <button type="button" className={`${base} ${variants[variant]}`} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}

const ALLOWED_TRANSITIONS: Record<ThreadStatus, ThreadStatus[]> = {
  open: ['clarifying', 'ready_to_plan', 'archived'],
  clarifying: ['ready_to_plan', 'archived'],
  ready_to_plan: ['pending_approval', 'clarifying', 'archived'],
  pending_approval: ['promoted', 'clarifying', 'archived'],
  promoted: ['archived'],
  archived: [],
};

const STATUS_LABELS: Record<ThreadStatus, string> = {
  open: 'Open',
  clarifying: 'Clarifying',
  ready_to_plan: 'Ready to Plan',
  pending_approval: 'Pending Approval',
  promoted: 'Promoted',
  archived: 'Archived',
};

/* ── page ────────────────────────────────────────────── */

export function ThreadDetailPage() {
  const params = useParams();
  const navigate = useNavigate();
  const threadId = params.threadId ?? '';
  const humanId = defaults.humanId;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [thread, setThread] = useState<QuestionThread | null>(null);
  const [events, setEvents] = useState<ThreadEvent[]>([]);
  const [packet, setPacket] = useState<PromotionPacket | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const reload = useCallback(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    Promise.all([
      api.getThread(threadId),
      api.listThreadEvents(threadId),
      api.getPromotionPacket(threadId).catch(() => null),
    ])
      .then(([t, e, p]) => {
        if (cancelled) return;
        setThread(t);
        setEvents(e);
        setPacket(p);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : String(err));
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [threadId]);

  useEffect(() => reload(), [reload]);

  const title = useMemo(() => thread?.title ?? `Thread ${threadId}`, [thread, threadId]);

  /* ── action helpers ─────────────────────────────────── */

  const doTransition = useCallback(
    async (to: ThreadStatus) => {
      setActionBusy(true);
      setActionError(null);
      try {
        const updated = await api.transitionThread(threadId, {
          to,
          actor_type: 'human',
          actor_id: humanId,
        });
        setThread(updated);
        // refresh events
        const evts = await api.listThreadEvents(threadId);
        setEvents(evts);
      } catch (err) {
        setActionError(err instanceof Error ? err.message : String(err));
      } finally {
        setActionBusy(false);
      }
    },
    [threadId, humanId],
  );

  const doClone = useCallback(async () => {
    setActionBusy(true);
    setActionError(null);
    try {
      const cloned = await api.cloneThread(threadId, {
        actor_type: 'human',
        actor_id: humanId,
      });
      navigate(`/threads/${encodeURIComponent(cloned.id)}`);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : String(err));
    } finally {
      setActionBusy(false);
    }
  }, [threadId, humanId, navigate]);

  const doPromote = useCallback(async () => {
    const taskTitle = window.prompt('First task title (required):');
    if (!taskTitle?.trim()) return;

    setActionBusy(true);
    setActionError(null);
    try {
      const result = await api.promoteThread(threadId, {
        actor_type: 'human',
        actor_id: humanId,
        tasks: [{ title: taskTitle.trim() }],
      });
      setThread(result.thread);
      const evts = await api.listThreadEvents(threadId);
      setEvents(evts);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : String(err));
    } finally {
      setActionBusy(false);
    }
  }, [threadId, humanId]);

  /* ── render ────────────────────────────────────────── */

  if (!threadId) return <div className="p-6 text-sm text-[rgb(var(--cb-text-muted))]">Missing thread id.</div>;
  if (loading) return <div className="p-6 text-sm text-[rgb(var(--cb-text-muted))]">Loading thread…</div>;
  if (error)
    return (
      <div className="p-6">
        <div className="rounded-md border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">{error}</div>
        <Link to="/attention" className="mt-3 inline-block text-sm text-[rgb(var(--cb-text-muted))] underline">
          Back to Attention
        </Link>
      </div>
    );
  if (!thread) return <div className="p-6 text-sm text-[rgb(var(--cb-text-muted))]">Thread not found.</div>;

  const transitions = ALLOWED_TRANSITIONS[thread.status] ?? [];

  return (
    <div className="space-y-4 p-6">
      {/* Header */}
      <div>
        <Link to="/attention" className="text-xs text-[rgb(var(--cb-text-muted))] underline">
          ← Attention
        </Link>
        <h1 className="mt-1 text-lg font-semibold text-[rgb(var(--cb-text))]">{title}</h1>
        <div className="mt-1 flex items-center gap-2 text-xs text-[rgb(var(--cb-text-muted))]">
          <span className="rounded-full border border-[rgb(var(--cb-border))] px-2 py-0.5 font-medium">
            {STATUS_LABELS[thread.status]}
          </span>
          <span>priority: {thread.priority}</span>
          <span>owner: {thread.owner_human_id}</span>
          {thread.cloned_from_thread_id && (
            <Link to={`/threads/${encodeURIComponent(thread.cloned_from_thread_id)}`} className="underline">
              cloned from {thread.cloned_from_thread_id.slice(0, 8)}…
            </Link>
          )}
        </div>
      </div>

      {/* Actions bar */}
      <div className="flex flex-wrap items-center gap-2">
        {transitions
          .filter((t) => t !== 'promoted') // promote has its own button
          .map((to) => (
            <Btn
              key={to}
              onClick={() => doTransition(to)}
              disabled={actionBusy}
              variant={to === 'archived' ? 'danger' : 'default'}
            >
              → {STATUS_LABELS[to]}
            </Btn>
          ))}

        {thread.status === 'pending_approval' && (
          <Btn onClick={doPromote} disabled={actionBusy} variant="primary">
            Promote to Task
          </Btn>
        )}

        {thread.status === 'archived' && (
          <Btn onClick={doClone} disabled={actionBusy} variant="primary">
            Clone (resume)
          </Btn>
        )}
      </div>

      {actionError && (
        <div className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
          {actionError}
        </div>
      )}

      {/* Problem statement */}
      <Section title="Problem statement">
        <div className="whitespace-pre-wrap text-sm text-[rgb(var(--cb-text))]">{thread.problem_statement}</div>
        {thread.current_state_summary && (
          <div className="mt-2 whitespace-pre-wrap text-sm text-[rgb(var(--cb-text-muted))]">
            <span className="font-medium">Current summary:</span> {thread.current_state_summary}
          </div>
        )}
      </Section>

      {/* Promotion packet */}
      <Section title="Promotion packet">
        {packet ? (
          <div className="space-y-1 text-xs text-[rgb(var(--cb-text-muted))]">
            <div>
              <span className="font-medium text-[rgb(var(--cb-text))]">Complete:</span>{' '}
              {packet.is_complete ? '✅ Yes' : '❌ No'}
            </div>
            {packet.problem && <div><span className="font-medium">Problem:</span> {packet.problem}</div>}
            {packet.desired_outcome && <div><span className="font-medium">Outcome:</span> {packet.desired_outcome}</div>}
            {packet.scope_in && <div><span className="font-medium">Scope in:</span> {packet.scope_in}</div>}
            {packet.scope_out && <div><span className="font-medium">Scope out:</span> {packet.scope_out}</div>}
            {packet.constraints && <div><span className="font-medium">Constraints:</span> {packet.constraints}</div>}
            {packet.first_executable_slice && <div><span className="font-medium">First slice:</span> {packet.first_executable_slice}</div>}
            {packet.acceptance_criteria.length > 0 && (
              <div>
                <span className="font-medium">Acceptance criteria:</span>
                <ul className="ml-4 mt-1 list-disc">
                  {packet.acceptance_criteria.map((c, i) => (
                    <li key={i}>{c}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : (
          <div className="text-xs text-[rgb(var(--cb-text-muted))]">No promotion packet yet.</div>
        )}
      </Section>

      {/* Event timeline */}
      <Section title={`Events (${events.length})`}>
        <div className="space-y-3">
          {events.length === 0 && <div className="text-xs text-[rgb(var(--cb-text-muted))]">No events.</div>}
          {events.map((ev) => (
            <div key={ev.id} className="rounded-md border border-[rgb(var(--cb-border))] bg-[rgb(var(--cb-bg))] p-3">
              <div className="flex items-baseline gap-2 text-xs text-[rgb(var(--cb-text-muted))]">
                <span className="rounded bg-[rgb(var(--cb-hover))] px-1.5 py-0.5 font-mono">{ev.event_type}</span>
                <span>{ev.actor_type}:{ev.actor_id}</span>
                <span className="ml-auto">{new Date(ev.created_at).toLocaleString()}</span>
              </div>
              {ev.body_md && (
                <div className="mt-1.5 whitespace-pre-wrap text-sm text-[rgb(var(--cb-text))]">{ev.body_md}</div>
              )}
              {ev.mention_human && ev.mention_payload && (
                <div className="mt-2 rounded border border-yellow-500/20 bg-yellow-500/5 p-2 text-xs">
                  <div className="font-medium text-yellow-300">Human ping</div>
                  <div className="mt-1 text-[rgb(var(--cb-text-muted))]">
                    <div><strong>Changed:</strong> {ev.mention_payload.what_changed}</div>
                    <div><strong>Need:</strong> {ev.mention_payload.what_you_need_from_human}</div>
                    {ev.mention_payload.options.length > 0 && (
                      <div><strong>Options:</strong> {ev.mention_payload.options.join(' | ')}</div>
                    )}
                    {ev.mention_payload.recommended_option && (
                      <div><strong>Recommended:</strong> {ev.mention_payload.recommended_option}</div>
                    )}
                  </div>
                </div>
              )}
              {ev.stance && (
                <div className="mt-1 text-xs text-[rgb(var(--cb-text-muted))]">stance: {ev.stance}</div>
              )}
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}

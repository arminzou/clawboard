import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, type PromotionPacket, type QuestionThread, type ThreadEvent, type ThreadStatus } from '../../lib/api';
import { defaults } from '../../lib/features';
import type { WsMessage } from '../../hooks/useWebSocket';

/* ── helpers ─────────────────────────────────────────── */

function Section({ title, children, actions }: { title: string; children: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-[rgb(var(--cb-border))] bg-[rgb(var(--cb-card))] p-4">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold text-[rgb(var(--cb-text))]">{title}</div>
        {actions && <div className="flex gap-2">{actions}</div>}
      </div>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function Btn({
  children,
  onClick,
  disabled,
  variant = 'default',
  size = 'md',
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  variant?: 'default' | 'primary' | 'danger';
  size?: 'sm' | 'md';
}) {
  const base = 'min-h-[44px] rounded-md font-medium transition disabled:opacity-40';
  const sizes = {
    sm: 'px-3 py-2 text-xs',
    md: 'px-4 py-2 text-sm',
  };
  const variants: Record<string, string> = {
    default: 'border border-[rgb(var(--cb-border))] text-[rgb(var(--cb-text-muted))] hover:bg-[rgb(var(--cb-hover))]',
    primary: 'bg-[rgb(var(--cb-accent))] text-white hover:opacity-90',
    danger: 'border border-red-500/30 text-red-400 hover:bg-red-500/10',
  };
  return (
    <button
      type="button"
      className={`${base} ${sizes[size]} ${variants[variant]}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}

function formatEventTimeExact(iso: string) {
  try {
    return new Intl.DateTimeFormat(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(iso));
  } catch {
    return new Date(iso).toLocaleString();
  }
}

function formatEventTimeRelative(iso: string) {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return formatEventTimeExact(iso);
  const deltaMs = Date.now() - t;
  const future = deltaMs < 0;
  const abs = Math.abs(deltaMs);
  const sec = Math.floor(abs / 1000);
  if (sec < 10) return 'just now';
  if (sec < 60) return future ? `in ${sec}s` : `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return future ? `in ${min}m` : `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return future ? `in ${hr}h` : `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return future ? `in ${day}d` : `${day}d ago`;
  return formatEventTimeExact(iso);
}

function PacketEditor({
  packet,
  onSave,
  onCancel,
}: {
  packet: Partial<PromotionPacket>;
  onSave: (data: Partial<PromotionPacket>) => Promise<void>;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState({
    problem: packet.problem ?? '',
    desired_outcome: packet.desired_outcome ?? '',
    scope_in: packet.scope_in ?? '',
    scope_out: packet.scope_out ?? '',
    constraints: packet.constraints ?? '',
    decision_owner_id: packet.decision_owner_id ?? '',
    first_executable_slice: packet.first_executable_slice ?? '',
    acceptance_criteria: (packet.acceptance_criteria ?? []).join('\n'),
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await onSave({
        ...formData,
        acceptance_criteria: formData.acceptance_criteria.split('\n').filter((l) => l.trim()),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setBusy(false);
    }
  };

  const handleChange = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {error && <div className="rounded border border-red-500/30 bg-red-500/10 p-2 text-xs text-red-300">{error}</div>}
      
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="block text-xs font-medium text-[rgb(var(--cb-text-muted))]">Problem</label>
          <textarea
            className="mt-1 block w-full rounded border border-[rgb(var(--cb-border))] bg-[rgb(var(--cb-bg))] px-2 py-1 text-xs text-[rgb(var(--cb-text))] focus:border-[rgb(var(--cb-accent))] focus:outline-none"
            rows={3}
            value={formData.problem}
            onChange={(e) => handleChange('problem', e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-[rgb(var(--cb-text-muted))]">Desired Outcome</label>
          <textarea
            className="mt-1 block w-full rounded border border-[rgb(var(--cb-border))] bg-[rgb(var(--cb-bg))] px-2 py-1 text-xs text-[rgb(var(--cb-text))] focus:border-[rgb(var(--cb-accent))] focus:outline-none"
            rows={3}
            value={formData.desired_outcome}
            onChange={(e) => handleChange('desired_outcome', e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-[rgb(var(--cb-text-muted))]">Scope In</label>
          <textarea
            className="mt-1 block w-full rounded border border-[rgb(var(--cb-border))] bg-[rgb(var(--cb-bg))] px-2 py-1 text-xs text-[rgb(var(--cb-text))] focus:border-[rgb(var(--cb-accent))] focus:outline-none"
            rows={3}
            value={formData.scope_in}
            onChange={(e) => handleChange('scope_in', e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-[rgb(var(--cb-text-muted))]">Scope Out</label>
          <textarea
            className="mt-1 block w-full rounded border border-[rgb(var(--cb-border))] bg-[rgb(var(--cb-bg))] px-2 py-1 text-xs text-[rgb(var(--cb-text))] focus:border-[rgb(var(--cb-accent))] focus:outline-none"
            rows={3}
            value={formData.scope_out}
            onChange={(e) => handleChange('scope_out', e.target.value)}
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-[rgb(var(--cb-text-muted))]">Constraints</label>
        <textarea
          className="mt-1 block w-full rounded border border-[rgb(var(--cb-border))] bg-[rgb(var(--cb-bg))] px-2 py-1 text-xs text-[rgb(var(--cb-text))] focus:border-[rgb(var(--cb-accent))] focus:outline-none"
          rows={2}
          value={formData.constraints}
          onChange={(e) => handleChange('constraints', e.target.value)}
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-[rgb(var(--cb-text-muted))]">Decision Owner</label>
        <input
          type="text"
          className="mt-1 block w-full rounded border border-[rgb(var(--cb-border))] bg-[rgb(var(--cb-bg))] px-2 py-1 text-xs text-[rgb(var(--cb-text))] focus:border-[rgb(var(--cb-accent))] focus:outline-none"
          value={formData.decision_owner_id}
          onChange={(e) => handleChange('decision_owner_id', e.target.value)}
          placeholder="e.g. armin"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-[rgb(var(--cb-text-muted))]">Acceptance Criteria (one per line)</label>
        <textarea
          className="mt-1 block w-full rounded border border-[rgb(var(--cb-border))] bg-[rgb(var(--cb-bg))] px-2 py-1 text-xs text-[rgb(var(--cb-text))] focus:border-[rgb(var(--cb-accent))] focus:outline-none"
          rows={4}
          value={formData.acceptance_criteria}
          onChange={(e) => handleChange('acceptance_criteria', e.target.value)}
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-[rgb(var(--cb-text-muted))]">First Executable Slice</label>
        <input
          type="text"
          className="mt-1 block w-full rounded border border-[rgb(var(--cb-border))] bg-[rgb(var(--cb-bg))] px-2 py-1 text-xs text-[rgb(var(--cb-text))] focus:border-[rgb(var(--cb-accent))] focus:outline-none"
          value={formData.first_executable_slice}
          onChange={(e) => handleChange('first_executable_slice', e.target.value)}
        />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Btn onClick={onCancel} disabled={busy}>
          Cancel
        </Btn>
        <button
          type="submit"
          className="rounded-md bg-[rgb(var(--cb-accent))] px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-40"
          disabled={busy}
        >
          {busy ? 'Saving…' : 'Save Packet'}
        </button>
      </div>
    </form>
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

const TRANSITION_ACTION_LABELS: Record<ThreadStatus, string> = {
  open: 'Move to Open',
  clarifying: 'Send back to Clarifying',
  ready_to_plan: 'Advance to Ready to Plan',
  pending_approval: 'Advance to Pending Approval',
  promoted: 'Mark as Promoted',
  archived: 'Archive thread',
};

function humanizeEventType(eventType: string) {
  return eventType.replaceAll('_', ' ');
}

function systemEventLabel(ev: ThreadEvent) {
  switch (ev.event_type) {
    case 'archived':
      return 'Thread archived';
    case 'thread_cloned':
      return 'Thread cloned';
    case 'promoted_to_task':
      return 'Promoted to task';
    default:
      return humanizeEventType(ev.event_type);
  }
}

function isSystemEvent(ev: ThreadEvent) {
  return (
    ev.actor_type === 'system' ||
    ev.event_type === 'archived' ||
    ev.event_type === 'thread_cloned' ||
    ev.event_type === 'promoted_to_task'
  );
}

/* ── page ────────────────────────────────────────────── */

export function ThreadDetailPage({ wsSignal }: { wsSignal: WsMessage | null }) {
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
  const [editingPacket, setEditingPacket] = useState(false);
  const [packetExpanded, setPacketExpanded] = useState(false);
  const [packetValidation, setPacketValidation] = useState<{ is_complete: boolean; missing_fields: string[] } | null>(null);

  const reload = useCallback(() => {
    let cancelled = false;
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

  useEffect(() => {
    setLoading(true);
    setEditingPacket(false);
    setPacketExpanded(false);
    return reload();
  }, [reload]);

  useEffect(() => {
    if (!wsSignal) return;
    const t = String(wsSignal.type || '');
    const d = wsSignal.data as { id?: string; thread_id?: string } | undefined;
    
    const isForThisThread = (d?.id === threadId) || (d?.thread_id === threadId);

    if ((t === 'thread_updated' && isForThisThread) || (t === 'thread_event_created' && isForThisThread)) {
       reload();
    }
  }, [wsSignal, reload, threadId]);

  const title = useMemo(() => thread?.title ?? `Thread ${threadId}`, [thread, threadId]);

  /* ── action helpers ─────────────────────────────────── */

  const doTransition = useCallback(
    async (to: ThreadStatus) => {
      if (to === 'archived') {
        const confirmed = window.confirm('Archive this thread? Archived threads are terminal and must be resumed via clone.');
        if (!confirmed) return;
      }

      setActionBusy(true);
      setActionError(null);
      try {
        const updated = await api.transitionThread(threadId, {
          to,
          actor_type: 'human',
          actor_id: humanId,
        });
        setThread(updated);
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
    // Basic UX for now: validate packet before promoting, then ask for first task.
    setActionError(null);
    const validation = await api.validatePromotionPacket(threadId).catch(() => null);
    if (validation && !validation.is_complete) {
      setPacketValidation(validation);
      setActionError(`Promotion packet incomplete: missing ${validation.missing_fields.join(', ')}`);
      return;
    }

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

  const savePacket = useCallback(async (data: Partial<PromotionPacket>) => {
    const saved = await api.putPromotionPacket(threadId, {
      ...data,
      actor_type: 'human',
      actor_id: humanId,
    });
    setPacket(saved);
    setPacketValidation(null);
    setEditingPacket(false);
    setPacketExpanded(false);
  }, [threadId, humanId]);

  const validatePacket = useCallback(async () => {
    setActionBusy(true);
    setActionError(null);
    try {
      const validation = await api.validatePromotionPacket(threadId);
      setPacketValidation(validation);
      if (!validation.is_complete) {
        setActionError(`Promotion packet incomplete: missing ${validation.missing_fields.join(', ')}`);
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : String(err));
    } finally {
      setActionBusy(false);
    }
  }, [threadId]);

  /* ── render ────────────────────────────────────────── */

  if (!threadId) return <div className="p-6 text-sm text-[rgb(var(--cb-text-muted))]">Missing thread id.</div>;
  if (loading && !thread) return <div className="p-6 text-sm text-[rgb(var(--cb-text-muted))]">Loading thread…</div>;
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
  const hasArchive = transitions.includes('archived');
  const nonDestructiveTransitions = transitions.filter((to) => to !== 'archived' && to !== 'promoted');

  // Pick a single "advance" transition as the primary action (when applicable).
  const ADVANCE_PRIORITY: Array<Exclude<ThreadStatus, 'promoted' | 'archived'>> = ['ready_to_plan', 'pending_approval'];
  const primaryTransition = ADVANCE_PRIORITY.find((s) => nonDestructiveTransitions.includes(s)) ?? nonDestructiveTransitions[0];
  const secondaryTransitions = nonDestructiveTransitions.filter((t) => t !== primaryTransition);

  const packetMissing = packetValidation && !packetValidation.is_complete ? packetValidation.missing_fields : [];
  const packetStatusLabel = packet?.is_complete ? 'Ready to promote ✅' : 'Not ready ❌';
  const orderedEvents = useMemo(
    () => [...events].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()),
    [events],
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <Link to="/attention" className="text-xs text-[rgb(var(--cb-text-muted))] underline">
          ← Attention
        </Link>
        <h1 className="mt-1 text-lg font-semibold text-[rgb(var(--cb-text))]">{title}</h1>
        <div className="mt-2 flex flex-col gap-1 text-xs text-[rgb(var(--cb-text-muted))] sm:flex-row sm:items-center sm:gap-2">
          <span className="w-fit whitespace-nowrap rounded-full border border-[rgb(var(--cb-border))] px-2 py-0.5 font-medium">
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
      <div className="rounded-lg border border-[rgb(var(--cb-border))] bg-[rgb(var(--cb-card))] p-3">
        <div className="flex flex-wrap items-center gap-2">
          {primaryTransition ? (
            <Btn
              onClick={() => doTransition(primaryTransition)}
              disabled={actionBusy}
              variant="primary"
            >
              {TRANSITION_ACTION_LABELS[primaryTransition] ?? `Move to ${STATUS_LABELS[primaryTransition]}`}
            </Btn>
          ) : null}

          {secondaryTransitions.map((to) => (
            <Btn
              key={to}
              onClick={() => doTransition(to)}
              disabled={actionBusy}
              variant="default"
            >
              {TRANSITION_ACTION_LABELS[to] ?? `Move to ${STATUS_LABELS[to]}`}
            </Btn>
          ))}

          {thread.status === 'pending_approval' && (
            <>
              <Btn onClick={validatePacket} disabled={actionBusy}>
                Validate packet
              </Btn>
              <Btn onClick={doPromote} disabled={actionBusy} variant="primary">
                Promote to task
              </Btn>
            </>
          )}

          {thread.status === 'archived' && (
            <Btn onClick={doClone} disabled={actionBusy} variant="primary">
              Clone to resume
            </Btn>
          )}
        </div>

        {hasArchive && thread.status !== 'archived' && (
          <div className="mt-3 border-t border-[rgb(var(--cb-border))] pt-3">
            <div className="mb-2 text-[11px] font-medium uppercase tracking-wide text-[rgb(var(--cb-text-muted))]">Destructive action</div>
            <Btn onClick={() => doTransition('archived')} disabled={actionBusy} variant="danger" size="sm">
              Archive thread
            </Btn>
          </div>
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
      <Section
        title="Promotion packet"
        actions={
          !editingPacket && (
            <div className="flex items-center gap-2">
              {packet ? (
                <Btn onClick={() => setPacketExpanded((prev) => !prev)} size="sm" disabled={actionBusy}>
                  {packetExpanded ? 'Collapse' : 'Expand'}
                </Btn>
              ) : null}
              <Btn onClick={validatePacket} size="sm" disabled={actionBusy}>
                Validate
              </Btn>
              <Btn
                onClick={() => {
                  setPacketExpanded(true);
                  setEditingPacket(true);
                }}
                size="sm"
                disabled={actionBusy}
              >
                {packet ? 'Edit' : 'Create packet'}
              </Btn>
            </div>
          )
        }
      >
        {editingPacket ? (
          <PacketEditor packet={packet ?? {}} onSave={savePacket} onCancel={() => { setEditingPacket(false); setPacketExpanded(Boolean(packet)); }} />
        ) : packet ? (
          <div className="space-y-3 text-xs text-[rgb(var(--cb-text-muted))]">
            <div className="rounded-md border border-[rgb(var(--cb-border))] bg-[rgb(var(--cb-bg))] px-3 py-2">
              <div className="text-[11px] uppercase tracking-wide text-[rgb(var(--cb-text-muted))]">Packet status</div>
              <div className={`mt-1 text-sm font-semibold ${packet.is_complete ? 'text-emerald-300' : 'text-amber-300'}`}>
                {packetStatusLabel}
              </div>
              {packetMissing.length > 0 && (
                <div className="mt-1 text-[11px] text-yellow-200">Missing: {packetMissing.join(', ')}</div>
              )}
            </div>

            {packetExpanded && (
              <div className="space-y-1">
                {packet.problem && <div><span className="font-medium text-[rgb(var(--cb-text))]">Problem:</span> {packet.problem}</div>}
                {packet.desired_outcome && <div><span className="font-medium text-[rgb(var(--cb-text))]">Outcome:</span> {packet.desired_outcome}</div>}
                {packet.scope_in && <div><span className="font-medium text-[rgb(var(--cb-text))]">Scope in:</span> {packet.scope_in}</div>}
                {packet.scope_out && <div><span className="font-medium text-[rgb(var(--cb-text))]">Scope out:</span> {packet.scope_out}</div>}
                {packet.constraints && <div><span className="font-medium text-[rgb(var(--cb-text))]">Constraints:</span> {packet.constraints}</div>}
                {packet.decision_owner_id && <div><span className="font-medium text-[rgb(var(--cb-text))]">Decision owner:</span> {packet.decision_owner_id}</div>}
                {packet.first_executable_slice && <div><span className="font-medium text-[rgb(var(--cb-text))]">First slice:</span> {packet.first_executable_slice}</div>}
                {packet.acceptance_criteria.length > 0 && (
                  <div>
                    <span className="font-medium text-[rgb(var(--cb-text))]">Acceptance criteria:</span>
                    <ul className="ml-4 mt-1 list-disc">
                      {packet.acceptance_criteria.map((c, i) => (
                        <li key={i}>{c}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="text-xs text-[rgb(var(--cb-text-muted))]">No promotion packet yet.</div>
        )}
      </Section>

      {/* Event timeline */}
      <Section title={`Events (${orderedEvents.length})`}>
        <div className="space-y-3">
          {orderedEvents.length === 0 && <div className="text-xs text-[rgb(var(--cb-text-muted))]">No events yet.</div>}
          {orderedEvents.map((ev, idx) => {
            const systemEvent = isSystemEvent(ev);
            const relativeTime = formatEventTimeRelative(ev.created_at);
            const exactTime = formatEventTimeExact(ev.created_at);

            if (systemEvent) {
              return (
                <div key={ev.id} className="flex items-center gap-2 text-[11px] text-[rgb(var(--cb-text-muted))]">
                  <div className="h-px flex-1 bg-[rgb(var(--cb-border))]" />
                  <span className="whitespace-nowrap rounded-full border border-[rgb(var(--cb-border))] bg-[rgb(var(--cb-bg))] px-2 py-0.5">
                    {systemEventLabel(ev)}
                  </span>
                  <span className="whitespace-nowrap" title={exactTime}>{relativeTime}</span>
                  <div className="h-px flex-1 bg-[rgb(var(--cb-border))]" />
                </div>
              );
            }

            const actorInitial = (ev.actor_id || '?').trim().charAt(0).toUpperCase();
            return (
              <div key={ev.id} className="relative pl-11">
                {idx < orderedEvents.length - 1 ? (
                  <div className="absolute left-4 top-8 h-[calc(100%-1.75rem)] w-px bg-[rgb(var(--cb-border))]" />
                ) : null}

                <div className="absolute left-0 top-0 inline-flex h-8 w-8 items-center justify-center rounded-full border border-[rgb(var(--cb-border))] bg-[rgb(var(--cb-bg))] text-xs font-semibold text-[rgb(var(--cb-text))]">
                  {actorInitial}
                </div>

                <div className="rounded-lg border border-[rgb(var(--cb-border))] bg-[rgb(var(--cb-bg))] p-3">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-[rgb(var(--cb-text-muted))]">
                    <span className="font-medium text-[rgb(var(--cb-text))]">{ev.actor_id}</span>
                    <span className="rounded bg-[rgb(var(--cb-hover))] px-1.5 py-0.5">{humanizeEventType(ev.event_type)}</span>
                    <span className="ml-auto whitespace-nowrap" title={exactTime}>{relativeTime}</span>
                  </div>

                  {ev.body_md ? (
                    <div className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[rgb(var(--cb-text))]">{ev.body_md}</div>
                  ) : null}

                  {ev.mention_human && ev.mention_payload ? (
                    <div className="mt-2 rounded border border-yellow-500/20 bg-yellow-500/5 p-2 text-xs">
                      <div className="font-medium text-yellow-300">Human ping</div>
                      <div className="mt-1 text-[rgb(var(--cb-text-muted))]">
                        <div><strong>Changed:</strong> {ev.mention_payload.what_changed}</div>
                        <div><strong>Need:</strong> {ev.mention_payload.what_you_need_from_human}</div>
                        {ev.mention_payload.options.length > 0 ? (
                          <div><strong>Options:</strong> {ev.mention_payload.options.join(' | ')}</div>
                        ) : null}
                        {ev.mention_payload.recommended_option ? (
                          <div><strong>Recommended:</strong> {ev.mention_payload.recommended_option}</div>
                        ) : null}
                      </div>
                    </div>
                  ) : null}

                  {ev.stance ? (
                    <div className="mt-2 text-xs text-[rgb(var(--cb-text-muted))]">stance: {ev.stance}</div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </Section>
    </div>
  );
}

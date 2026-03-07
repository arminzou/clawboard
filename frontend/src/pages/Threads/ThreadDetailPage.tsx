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
  const base = 'rounded-md font-medium transition disabled:opacity-40';
  const sizes = {
    sm: 'px-2 py-1 text-[10px]',
    md: 'px-3 py-1.5 text-xs',
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
          .filter((t) => t !== 'promoted')
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
          <>
            <Btn onClick={validatePacket} disabled={actionBusy}>
              Validate packet
            </Btn>
            <Btn onClick={doPromote} disabled={actionBusy} variant="primary">
              Promote to Task
            </Btn>
          </>
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
      <Section
        title="Promotion packet"
        actions={
          !editingPacket && (
            <div className="flex items-center gap-2">
              <Btn onClick={validatePacket} size="sm" disabled={actionBusy}>
                Validate
              </Btn>
              <Btn onClick={() => setEditingPacket(true)} size="sm" disabled={actionBusy}>
                Edit
              </Btn>
            </div>
          )
        }
      >
        {editingPacket ? (
          <PacketEditor packet={packet ?? {}} onSave={savePacket} onCancel={() => setEditingPacket(false)} />
        ) : packet ? (
          <div className="space-y-1 text-xs text-[rgb(var(--cb-text-muted))]">
            <div>
              <span className="font-medium text-[rgb(var(--cb-text))]">Complete:</span>{' '}
              {packet.is_complete ? '✅ Yes' : '❌ No'}
            </div>
            {packetValidation && !packetValidation.is_complete && (
              <div className="rounded border border-yellow-500/20 bg-yellow-500/5 p-2 text-xs text-yellow-200">
                Missing: {packetValidation.missing_fields.join(', ')}
              </div>
            )}
            {packet.problem && <div><span className="font-medium">Problem:</span> {packet.problem}</div>}
            {packet.desired_outcome && <div><span className="font-medium">Outcome:</span> {packet.desired_outcome}</div>}
            {packet.scope_in && <div><span className="font-medium">Scope in:</span> {packet.scope_in}</div>}
            {packet.scope_out && <div><span className="font-medium">Scope out:</span> {packet.scope_out}</div>}
            {packet.constraints && <div><span className="font-medium">Constraints:</span> {packet.constraints}</div>}
            {packet.decision_owner_id && <div><span className="font-medium">Decision owner:</span> {packet.decision_owner_id}</div>}
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

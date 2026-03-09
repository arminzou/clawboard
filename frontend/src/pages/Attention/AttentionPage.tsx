import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, type QuestionThread, type ThreadPriority } from '../../lib/api';
import { defaults } from '../../lib/features';
import { X } from 'lucide-react';
import type { WsMessage } from '../../hooks/useWebSocket';

type BucketKey = 'needs_decision' | 'needs_clarification' | 'needs_approval' | 'blocked_on_human';

const BUCKET_META: Record<BucketKey, { label: string; accent: string }> = {
  needs_decision: { label: 'Needs Decision', accent: 'border-amber-500/30' },
  needs_clarification: { label: 'Needs Clarification', accent: 'border-blue-500/30' },
  needs_approval: { label: 'Needs Approval', accent: 'border-green-500/30' },
  blocked_on_human: { label: 'Blocked on You', accent: 'border-red-500/30' },
};

function Bucket({ bucketKey, threads }: { bucketKey: BucketKey; threads: QuestionThread[] }) {
  const meta = BUCKET_META[bucketKey];
  return (
    <section className={`rounded-lg border ${meta.accent} bg-[rgb(var(--cb-card))] p-4`}>
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-semibold text-[rgb(var(--cb-text))]">{meta.label}</span>
        <span className="text-xs text-[rgb(var(--cb-text-muted))]">{threads.length}</span>
      </div>
      <div className="mt-3 space-y-2">
        {threads.length === 0 ? (
          <div className="text-xs text-[rgb(var(--cb-text-muted))]">Nothing here.</div>
        ) : (
          threads.map((t) => (
            <Link
              key={t.id}
              to={`/threads/${encodeURIComponent(t.id)}`}
              className="block rounded-md border border-[rgb(var(--cb-border))] bg-[rgb(var(--cb-bg))] px-3 py-2 text-sm text-[rgb(var(--cb-text))] hover:bg-[rgb(var(--cb-hover))]"
            >
              <div className="font-medium">{t.title}</div>
              <div className="mt-0.5 text-xs text-[rgb(var(--cb-text-muted))]">
                {t.status} • priority: {t.priority} • {new Date(t.updated_at).toLocaleDateString()}
              </div>
            </Link>
          ))
        )}
      </div>
    </section>
  );
}

function CreateThreadModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: (id: string) => void }) {
  const [title, setTitle] = useState('');
  const [problem, setProblem] = useState('');
  const [priority, setPriority] = useState<ThreadPriority>('medium');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !problem.trim()) return;

    setBusy(true);
    setError(null);

    try {
      const thread = await api.createThread({
        workspace_id: 'default',
        title: title.trim(),
        problem_statement: problem.trim(),
        owner_human_id: defaults.humanId,
        created_by_type: 'human',
        created_by_id: defaults.humanId,
        priority,
      });
      onSuccess(thread.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-lg border border-[rgb(var(--cb-border))] bg-[rgb(var(--cb-card))] shadow-xl">
        <div className="flex items-center justify-between border-b border-[rgb(var(--cb-border))] p-4">
          <h2 className="text-lg font-semibold text-[rgb(var(--cb-text))]">New Thread</h2>
          <button
            onClick={onClose}
            className="text-[rgb(var(--cb-text-muted))] hover:text-[rgb(var(--cb-text))]"
            disabled={busy}
          >
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {error && (
            <div className="rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
              {error}
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-[rgb(var(--cb-text-muted))]">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 block w-full rounded-md border border-[rgb(var(--cb-border))] bg-[rgb(var(--cb-bg))] px-3 py-2 text-sm text-[rgb(var(--cb-text))] focus:border-[rgb(var(--cb-accent))] focus:outline-none"
              placeholder="e.g. Database migration strategy"
              required
              autoFocus
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[rgb(var(--cb-text-muted))]">Problem Statement</label>
            <textarea
              value={problem}
              onChange={(e) => setProblem(e.target.value)}
              className="mt-1 block w-full rounded-md border border-[rgb(var(--cb-border))] bg-[rgb(var(--cb-bg))] px-3 py-2 text-sm text-[rgb(var(--cb-text))] focus:border-[rgb(var(--cb-accent))] focus:outline-none"
              placeholder="Describe the context and what needs to be solved..."
              rows={4}
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[rgb(var(--cb-text-muted))]">Priority</label>
            <select
              value={priority ?? 'medium'}
              onChange={(e) => setPriority(e.target.value as ThreadPriority)}
              className="mt-1 block w-full rounded-md border border-[rgb(var(--cb-border))] bg-[rgb(var(--cb-bg))] px-3 py-2 text-sm text-[rgb(var(--cb-text))] focus:border-[rgb(var(--cb-accent))] focus:outline-none"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md px-4 py-2 text-sm font-medium text-[rgb(var(--cb-text-muted))] hover:bg-[rgb(var(--cb-hover))]"
              disabled={busy}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-md bg-[rgb(var(--cb-accent))] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
              disabled={busy}
            >
              {busy ? 'Creating…' : 'Create Thread'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function AttentionPage({ wsSignal }: { wsSignal: WsMessage | null }) {
  const humanId = defaults.humanId;
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [buckets, setBuckets] = useState<Record<BucketKey, QuestionThread[]>>({
    needs_decision: [],
    needs_clarification: [],
    needs_approval: [],
    blocked_on_human: [],
  });
  const [isCreating, setIsCreating] = useState(false);

  const loadData = useCallback(() => {
    let cancelled = false;
    // Keep loading true if it was true (initial load).
    // If we're refreshing (wsSignal), we might want to keep it false to avoid flicker.
    // So we don't set loading=true here.
    
    setError(null);

    api
      .getHumanAttention(humanId)
      .then((data) => {
        if (cancelled) return;
        setBuckets(data);
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
  }, [humanId]);

  useEffect(() => loadData(), [loadData]);

  useEffect(() => {
    if (!wsSignal) return;
    const t = String(wsSignal.type || '');
    if (t === 'thread_created' || t === 'thread_updated' || t === 'thread_event_created') {
      return loadData();
    }
  }, [wsSignal, loadData]);

  const total = useMemo(
    () => Object.values(buckets).reduce((acc, list) => acc + list.length, 0),
    [buckets],
  );

  if (loading && !Object.values(buckets).some(l => l.length > 0)) return <div className="p-6 text-sm text-[rgb(var(--cb-text-muted))]">Loading attention…</div>;

  if (error)
    return (
      <div className="p-6">
        <div className="rounded-md border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">{error}</div>
        <div className="mt-3 text-xs text-[rgb(var(--cb-text-muted))]">
          (Ensure backend flag PAWVY_FEATURE_THREAD_FIRST_V1 is enabled.)
        </div>
      </div>
    );

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="text-xs text-[rgb(var(--cb-text-muted))]">
          Human: {humanId} • {total} item{total !== 1 ? 's' : ''} needing attention
        </div>
        <button
          onClick={() => setIsCreating(true)}
          className="rounded-md bg-[rgb(var(--cb-accent))] px-3 py-1.5 text-xs font-medium text-white hover:opacity-90"
        >
          New Thread
        </button>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2">
        {(Object.keys(BUCKET_META) as BucketKey[]).map((key) => (
          <Bucket key={key} bucketKey={key} threads={buckets[key]} />
        ))}
      </div>

      {isCreating && (
        <CreateThreadModal
          onClose={() => setIsCreating(false)}
          onSuccess={(id) => {
            setIsCreating(false);
            navigate(`/threads/${encodeURIComponent(id)}`);
          }}
        />
      )}
    </div>
  );
}

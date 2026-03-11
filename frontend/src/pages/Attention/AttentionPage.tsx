import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, type QuestionThread, type ThreadPriority } from '../../lib/api';
import { defaults } from '../../lib/features';
import { X } from 'lucide-react';
import type { WsMessage } from '../../hooks/useWebSocket';

type BucketKey = 'needs_decision' | 'needs_clarification' | 'needs_approval' | 'blocked_on_human';

type ThreadSort = 'updated_desc' | 'updated_asc' | 'priority_desc';

const PRIORITY_RANK: Record<ThreadPriority, number> = {
  high: 3,
  medium: 2,
  low: 1,
};

const BUCKET_META: Record<
  BucketKey,
  { label: string; shortLabel: string; accent: string; emptyCopy: string }
> = {
  needs_decision: {
    label: 'Needs Decision',
    shortLabel: 'Decision',
    accent: 'border-amber-500/30',
    emptyCopy: 'No decisions waiting — nice and clear here.',
  },
  needs_clarification: {
    label: 'Needs Clarification',
    shortLabel: 'Clarify',
    accent: 'border-blue-500/30',
    emptyCopy: 'No clarification requests right now.',
  },
  needs_approval: {
    label: 'Needs Approval',
    shortLabel: 'Approval',
    accent: 'border-green-500/30',
    emptyCopy: 'No approvals waiting 🎉',
  },
  blocked_on_human: {
    label: 'Blocked on You',
    shortLabel: 'Blocked',
    accent: 'border-rose-500/30',
    emptyCopy: 'Nothing is currently blocked on you.',
  },
};

function formatRelative(iso: string) {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return 'unknown';
  const delta = Math.max(0, Date.now() - t);
  const m = Math.floor(delta / 60_000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

function Bucket({ bucketKey, threads }: { bucketKey: BucketKey; threads: QuestionThread[] }) {
  const meta = BUCKET_META[bucketKey];

  return (
    <section className={`w-full rounded-lg border ${meta.accent} bg-[rgb(var(--cb-card))] p-4`}>
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-semibold text-[rgb(var(--cb-text))]">{meta.label}</span>
        <span className="text-xs text-[rgb(var(--cb-text-muted))]">{threads.length}</span>
      </div>

      <div className="mt-3 space-y-2">
        {threads.length === 0 ? (
          <div className="rounded-md border border-dashed border-[rgb(var(--cb-border))] bg-[rgb(var(--cb-bg))] px-3 py-2 text-xs text-[rgb(var(--cb-text-muted))]">
            {meta.emptyCopy}
          </div>
        ) : (
          threads.map((t) => {
            const stale = Date.now() - new Date(t.updated_at).getTime() > 24 * 60 * 60 * 1000;
            return (
              <Link
                key={t.id}
                to={`/threads/${encodeURIComponent(t.id)}`}
                className={`block rounded-md border bg-[rgb(var(--cb-bg))] px-3 py-2 text-sm text-[rgb(var(--cb-text))] hover:bg-[rgb(var(--cb-hover))] ${
                  stale ? 'border-amber-500/30' : 'border-[rgb(var(--cb-border))]'
                }`}
              >
                <div className="truncate font-semibold">{t.title}</div>
                <div className="mt-0.5 truncate text-xs text-[rgb(var(--cb-text-muted))]">{t.problem_statement}</div>
                <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] text-[rgb(var(--cb-text-muted))]">
                  <span className="rounded border border-[rgb(var(--cb-border))] px-1.5 py-0.5">{t.status}</span>
                  <span
                    className={`rounded px-1.5 py-0.5 ${
                      t.priority === 'high'
                        ? 'bg-rose-500/15 text-rose-300'
                        : t.priority === 'medium'
                        ? 'bg-amber-500/15 text-amber-300'
                        : 'bg-slate-500/15 text-slate-300'
                    }`}
                  >
                    {t.priority}
                  </span>
                  <span>{formatRelative(t.updated_at)}</span>
                  {stale ? <span className="text-amber-300">stale</span> : null}
                </div>
              </Link>
            );
          })
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

  const canSubmit = title.trim().length > 0 && problem.trim().length > 0 && !busy;

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
    <div className="fixed inset-0 z-[200] bg-[rgb(var(--cb-bg))] sm:flex sm:items-center sm:justify-center sm:bg-black/50 sm:px-3 sm:py-6 sm:backdrop-blur-[1px]">
      <div className="flex h-full w-full flex-col bg-[rgb(var(--cb-bg))] sm:h-[92vh] sm:max-h-[760px] sm:max-w-2xl sm:overflow-hidden sm:rounded-2xl sm:border sm:border-[rgb(var(--cb-border))] sm:bg-[rgb(var(--cb-card))] sm:shadow-2xl">
        <div className="grid grid-cols-[44px_1fr_auto] items-center gap-3 border-b border-[rgb(var(--cb-border))] px-4 py-3 sm:px-5">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[rgb(var(--cb-border))] text-[rgb(var(--cb-text-muted))] hover:bg-[rgb(var(--cb-hover))] hover:text-[rgb(var(--cb-text))]"
            disabled={busy}
            aria-label="Close thread creation"
          >
            <X size={20} />
          </button>

          <div className="min-w-0 text-center">
            <h2 className="truncate text-base font-semibold text-[rgb(var(--cb-text))] sm:text-lg">Create thread</h2>
            <p className="truncate text-[11px] text-[rgb(var(--cb-text-muted))]">Start a conversation with your agents</p>
          </div>

          <button
            type="submit"
            form="create-thread-form"
            className="rounded-full bg-[rgb(var(--cb-accent))] px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-40"
            disabled={!canSubmit}
          >
            {busy ? 'Creating…' : 'Submit'}
          </button>
        </div>

        <form id="create-thread-form" onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="space-y-5 overflow-y-auto px-4 py-4 sm:px-5 sm:py-5">
            {error && (
              <div className="rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
                {error}
              </div>
            )}

            <div>
              <label className="block text-[13px] font-medium text-[rgb(var(--cb-text-muted))]">Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-2 block w-full border-0 border-b border-[rgb(var(--cb-border))] bg-transparent px-0 py-2 text-2xl font-medium text-[rgb(var(--cb-text))] placeholder:text-[rgb(var(--cb-text-muted))] focus:border-[rgb(var(--cb-accent))] focus:outline-none"
                placeholder="Start with a clear one-line title"
                required
                autoFocus
              />
            </div>

            <div>
              <label className="block text-[13px] font-medium text-[rgb(var(--cb-text-muted))]">What do you need help with?</label>
              <textarea
                value={problem}
                onChange={(e) => setProblem(e.target.value)}
                className="mt-3 block min-h-[46vh] w-full resize-none border-0 bg-transparent px-0 py-0 text-base leading-7 text-[rgb(var(--cb-text))] placeholder:text-[rgb(var(--cb-text-muted))] focus:outline-none"
                placeholder="Start a conversation..."
                rows={12}
                required
              />
            </div>

            <details className="pt-2">
              <summary className="cursor-pointer text-xs font-medium text-[rgb(var(--cb-text-muted))]">Optional details</summary>
              <div className="mt-3">
                <label className="block text-xs font-medium text-[rgb(var(--cb-text-muted))]">Priority</label>
                <select
                  value={priority ?? 'medium'}
                  onChange={(e) => setPriority(e.target.value as ThreadPriority)}
                  className="mt-1.5 block w-full rounded-md border border-[rgb(var(--cb-border))] bg-[rgb(var(--cb-card))] px-3 py-2 text-sm text-[rgb(var(--cb-text))] focus:border-[rgb(var(--cb-accent))] focus:outline-none"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
            </details>
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
  const [query, setQuery] = useState('');
  const [sortBy, setSortBy] = useState<ThreadSort>('updated_desc');
  const [activeBucket, setActiveBucket] = useState<BucketKey>('needs_decision');

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

  const rawTotal = useMemo(
    () => Object.values(buckets).reduce((acc, list) => acc + list.length, 0),
    [buckets],
  );

  const processedBuckets = useMemo(() => {
    const q = query.trim().toLowerCase();

    const sortThreads = (list: QuestionThread[]) => {
      const items = [...list];
      items.sort((a, b) => {
        if (sortBy === 'updated_asc') {
          return new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime();
        }
        if (sortBy === 'priority_desc') {
          const pr = PRIORITY_RANK[b.priority] - PRIORITY_RANK[a.priority];
          if (pr !== 0) return pr;
          return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
        }
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      });
      return items;
    };

    const filterThreads = (list: QuestionThread[]) => {
      if (!q) return list;
      return list.filter((t) => {
        const title = t.title.toLowerCase();
        const body = t.problem_statement.toLowerCase();
        return title.includes(q) || body.includes(q);
      });
    };

    return {
      needs_decision: sortThreads(filterThreads(buckets.needs_decision)),
      needs_clarification: sortThreads(filterThreads(buckets.needs_clarification)),
      needs_approval: sortThreads(filterThreads(buckets.needs_approval)),
      blocked_on_human: sortThreads(filterThreads(buckets.blocked_on_human)),
    } as Record<BucketKey, QuestionThread[]>;
  }, [buckets, query, sortBy]);

  const filteredTotal = useMemo(
    () => Object.values(processedBuckets).reduce((acc, list) => acc + list.length, 0),
    [processedBuckets],
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
    <div className="w-full">
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-xs text-[rgb(var(--cb-text-muted))]">
          Human: {humanId} • {filteredTotal}
          {query.trim() ? ` of ${rawTotal}` : ''} item{filteredTotal !== 1 ? 's' : ''} needing attention
        </div>
        <button
          onClick={() => setIsCreating(true)}
          className="min-h-[44px] w-full rounded-md bg-[rgb(var(--cb-accent))] px-4 py-2 text-sm font-medium text-white hover:opacity-90 sm:min-h-0 sm:w-auto sm:px-3 sm:py-1.5 sm:text-xs"
        >
          New Thread
        </button>
      </div>

      <div className="mb-4 grid gap-2 sm:grid-cols-[minmax(0,1fr)_170px]">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search threads by title or context..."
          className="h-10 rounded-md border border-[rgb(var(--cb-border))] bg-[rgb(var(--cb-card))] px-3 text-sm text-[rgb(var(--cb-text))] placeholder:text-[rgb(var(--cb-text-muted))] focus:border-[rgb(var(--cb-accent))] focus:outline-none"
        />
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as ThreadSort)}
          className="h-10 rounded-md border border-[rgb(var(--cb-border))] bg-[rgb(var(--cb-card))] px-3 text-sm text-[rgb(var(--cb-text))] focus:border-[rgb(var(--cb-accent))] focus:outline-none"
        >
          <option value="updated_desc">Sort: Updated (newest)</option>
          <option value="updated_asc">Sort: Updated (oldest)</option>
          <option value="priority_desc">Sort: Priority (high first)</option>
        </select>
      </div>

      <div className="mb-4 flex gap-2 overflow-x-auto pb-1 md:hidden">
        {(Object.keys(BUCKET_META) as BucketKey[]).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setActiveBucket(key)}
            className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium ${
              activeBucket === key
                ? 'border-[rgb(var(--cb-accent))] bg-[rgb(var(--cb-accent))] text-white'
                : 'border-[rgb(var(--cb-border))] bg-[rgb(var(--cb-card))] text-[rgb(var(--cb-text-muted))]'
            }`}
          >
            {BUCKET_META[key].shortLabel} ({processedBuckets[key].length})
          </button>
        ))}
      </div>

      {filteredTotal === 0 ? (
        <div className="rounded-lg border border-dashed border-[rgb(var(--cb-border))] bg-[rgb(var(--cb-card))] px-4 py-8 text-center">
          <div className="text-sm font-medium text-[rgb(var(--cb-text))]">No threads match your current view.</div>
          <div className="mt-1 text-xs text-[rgb(var(--cb-text-muted))]">
            Try clearing search or start a new thread to collaborate with your agents.
          </div>
          <button
            type="button"
            onClick={() => setIsCreating(true)}
            className="mt-4 rounded-md bg-[rgb(var(--cb-accent))] px-3 py-2 text-xs font-medium text-white hover:opacity-90"
          >
            Start a thread
          </button>
        </div>
      ) : (
        <>
          <div className="md:hidden">
            <Bucket bucketKey={activeBucket} threads={processedBuckets[activeBucket]} />
          </div>
          <div className="hidden gap-4 md:grid md:grid-cols-2">
            {(Object.keys(BUCKET_META) as BucketKey[]).map((key) => (
              <Bucket key={key} bucketKey={key} threads={processedBuckets[key]} />
            ))}
          </div>
        </>
      )}

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

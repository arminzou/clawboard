import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, type QuestionThread } from '../../lib/api';
import { defaults } from '../../lib/features';

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

export function AttentionPage() {
  const humanId = defaults.humanId;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [buckets, setBuckets] = useState<Record<BucketKey, QuestionThread[]>>({
    needs_decision: [],
    needs_clarification: [],
    needs_approval: [],
    blocked_on_human: [],
  });

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
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

  const total = useMemo(
    () => Object.values(buckets).reduce((acc, list) => acc + list.length, 0),
    [buckets],
  );

  if (loading) return <div className="p-6 text-sm text-[rgb(var(--cb-text-muted))]">Loading attention…</div>;

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
      <div className="text-xs text-[rgb(var(--cb-text-muted))]">
        Human: {humanId} • {total} item{total !== 1 ? 's' : ''} needing attention
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {(Object.keys(BUCKET_META) as BucketKey[]).map((key) => (
          <Bucket key={key} bucketKey={key} threads={buckets[key]} />
        ))}
      </div>
    </div>
  );
}

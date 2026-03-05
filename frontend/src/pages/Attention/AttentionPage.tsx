import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, type QuestionThread } from '../../lib/api';
import { defaults } from '../../lib/features';

type BucketKey = 'needs_decision' | 'needs_clarification' | 'needs_approval' | 'blocked_on_human';

const BUCKET_LABELS: Record<BucketKey, string> = {
  needs_decision: 'Needs decision',
  needs_clarification: 'Needs clarification',
  needs_approval: 'Needs approval',
  blocked_on_human: 'Blocked on you',
};

function Bucket({ title, threads }: { title: string; threads: QuestionThread[] }) {
  return (
    <section className="rounded-lg border border-white/10 bg-white/4 p-4">
      <div className="text-sm font-semibold text-white/90">{title}</div>
      <div className="mt-3 space-y-2">
        {threads.length === 0 ? (
          <div className="text-xs text-white/55">Nothing here.</div>
        ) : (
          threads.map((t) => (
            <Link
              key={t.id}
              to={`/threads/${encodeURIComponent(t.id)}`}
              className="block rounded-md border border-white/10 bg-white/3 px-3 py-2 text-sm text-white/85 hover:bg-white/6"
            >
              <div className="font-medium">{t.title}</div>
              <div className="mt-0.5 text-xs text-white/55">status: {t.status} • updated: {new Date(t.updated_at).toLocaleString()}</div>
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

  if (loading) {
    return <div className="p-6 text-sm text-white/70">Loading attention…</div>;
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="rounded-md border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-100">
          Failed to load attention list: {error}
        </div>
        <div className="mt-3 text-xs text-white/60">
          (Make sure backend feature flag PAWVY_FEATURE_THREAD_FIRST_V1 is enabled.)
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="text-xs text-white/60">Human: {humanId} • Total: {total}</div>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {(Object.keys(BUCKET_LABELS) as BucketKey[]).map((key) => (
          <Bucket key={key} title={BUCKET_LABELS[key]} threads={buckets[key]} />
        ))}
      </div>
    </div>
  );
}

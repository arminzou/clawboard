import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, type PromotionPacket, type QuestionThread, type ThreadEvent } from '../../lib/api';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-white/10 bg-white/4 p-4">
      <div className="text-sm font-semibold text-white/90">{title}</div>
      <div className="mt-3">{children}</div>
    </section>
  );
}

export function ThreadDetailPage() {
  const params = useParams();
  const threadId = params.threadId ?? '';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [thread, setThread] = useState<QuestionThread | null>(null);
  const [events, setEvents] = useState<ThreadEvent[]>([]);
  const [packet, setPacket] = useState<PromotionPacket | null>(null);

  useEffect(() => {
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

  const title = useMemo(() => thread?.title ?? `Thread ${threadId}`, [thread, threadId]);

  if (!threadId) {
    return <div className="p-6 text-sm text-white/70">Missing thread id.</div>;
  }

  if (loading) {
    return <div className="p-6 text-sm text-white/70">Loading thread…</div>;
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="rounded-md border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-100">
          Failed to load thread: {error}
        </div>
        <div className="mt-3">
          <Link to="/attention" className="text-sm text-white/80 underline">
            Back to Attention
          </Link>
        </div>
      </div>
    );
  }

  if (!thread) {
    return <div className="p-6 text-sm text-white/70">Thread not found.</div>;
  }

  return (
    <div className="p-6 space-y-4">
      <div>
        <div className="text-xs text-white/60">Thread</div>
        <div className="text-lg font-semibold text-white/90">{title}</div>
        <div className="mt-1 text-xs text-white/60">status: {thread.status} • priority: {thread.priority}</div>
        <div className="mt-2">
          <Link to="/attention" className="text-sm text-white/80 underline">
            Back to Attention
          </Link>
        </div>
      </div>

      <Section title="Problem statement">
        <div className="whitespace-pre-wrap text-sm text-white/80">{thread.problem_statement}</div>
      </Section>

      <Section title="Promotion packet">
        {packet ? (
          <pre className="whitespace-pre-wrap text-xs text-white/70">{JSON.stringify(packet, null, 2)}</pre>
        ) : (
          <div className="text-xs text-white/60">No promotion packet yet.</div>
        )}
      </Section>

      <Section title={`Events (${events.length})`}>
        <div className="space-y-3">
          {events.map((ev) => (
            <div key={ev.id} className="rounded-md border border-white/10 bg-white/3 p-3">
              <div className="text-xs text-white/60">
                {new Date(ev.created_at).toLocaleString()} • {ev.event_type} • {ev.actor_type}:{ev.actor_id}
              </div>
              {ev.body_md ? <div className="mt-1 whitespace-pre-wrap text-sm text-white/80">{ev.body_md}</div> : null}
              {ev.mention_human && ev.mention_payload ? (
                <pre className="mt-2 whitespace-pre-wrap text-xs text-white/65">{JSON.stringify(ev.mention_payload, null, 2)}</pre>
              ) : null}
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}

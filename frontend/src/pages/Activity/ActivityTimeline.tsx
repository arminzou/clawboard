import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { api } from '../../lib/api';
import type { Activity, Task, Project } from '../../lib/api';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Panel } from '../../components/ui/Panel';
import { useAgentPresence } from '../../components/layout/AgentPresenceContext';
import { profileForAgent } from '../../components/layout/agentProfile';

type ParsedDetails = {
  files: string[];
  commitSummary: string | null;
  keyDecisions: string[];
};

function when(ts: string) {
  const d = new Date(ts);
  return d.toLocaleString();
}

function parseFilesFromObject(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) {
    return Array.from(
      new Set(
        value
          .map((item) => String(item ?? '').trim())
          .filter(Boolean),
      ),
    );
  }
  if (typeof value === 'string') {
    return value
      .split('\n')
      .map((part) => part.trim())
      .filter(Boolean);
  }
  return [];
}

function parseDetails(raw: string | null): ParsedDetails {
  if (!raw) return { files: [], commitSummary: null, keyDecisions: [] };
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const toolArguments = parsed.arguments && typeof parsed.arguments === 'object' ? (parsed.arguments as Record<string, unknown>) : null;

    const files = Array.from(
      new Set(
        [
          ...parseFilesFromObject(parsed.files),
          ...parseFilesFromObject(parsed.file_paths),
          ...parseFilesFromObject(parsed.touched_files),
          ...parseFilesFromObject(toolArguments?.files),
          ...parseFilesFromObject(toolArguments?.paths),
          ...parseFilesFromObject(toolArguments?.file_path),
        ],
      ),
    );

    const commitSummary = String(
      parsed.commit_summary ??
      parsed.commitSummary ??
      parsed.summary ??
      toolArguments?.commit_summary ??
      '',
    ).trim() || null;

    const keyDecisionsRaw = parsed.key_decisions ?? parsed.decisions ?? parsed.keyDecisions;
    const keyDecisions = Array.from(
      new Set(
        parseFilesFromObject(keyDecisionsRaw).map((item) => item.replace(/^\-\s*/, '').trim()).filter(Boolean),
      ),
    );

    return { files, commitSummary, keyDecisions };
  } catch {
    return { files: [], commitSummary: null, keyDecisions: [] };
  }
}

function toIsoRangeEnd(dateRaw: string): string | undefined {
  if (!dateRaw) return undefined;
  const d = new Date(`${dateRaw}T23:59:59.999`);
  return Number.isFinite(d.getTime()) ? d.toISOString() : undefined;
}

export function ActivityTimeline({
  wsSignal,
  onOpenTask,
}: {
  wsSignal?: { type?: string; data?: unknown } | null;
  onOpenTask?: (id: number) => void;
}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const { agentIds, profileSources } = useAgentPresence();

  const [items, setItems] = useState<Activity[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [agent, setAgent] = useState<string>(() => {
    try {
      const fromQuery = new URLSearchParams(window.location.search).get('agent');
      if (fromQuery) return fromQuery;
      return window.localStorage.getItem('cb.activity.agent') ?? '';
    } catch {
      return '';
    }
  });
  const [projectId, setProjectId] = useState<string>(() => {
    try {
      return window.localStorage.getItem('cb.activity.projectId') ?? '';
    } catch {
      return '';
    }
  });
  const [taskId, setTaskId] = useState<string>(() => {
    try {
      return window.localStorage.getItem('cb.activity.taskId') ?? '';
    } catch {
      return '';
    }
  });
  const [dateFrom, setDateFrom] = useState<string>(() => {
    try {
      return window.localStorage.getItem('cb.activity.dateFrom') ?? '';
    } catch {
      return '';
    }
  });
  const [dateTo, setDateTo] = useState<string>(() => {
    try {
      return window.localStorage.getItem('cb.activity.dateTo') ?? '';
    } catch {
      return '';
    }
  });
  const [searchText, setSearchText] = useState<string>(() => {
    try {
      return window.localStorage.getItem('cb.activity.q') ?? '';
    } catch {
      return '';
    }
  });
  const [ingesting, setIngesting] = useState(false);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const projectIdNum = projectId ? Number(projectId) : undefined;
      const taskIdNum = taskId ? Number(taskId) : undefined;
      const list = await api.listActivities({
        limit: 300,
        agent: agent || undefined,
        project_id: Number.isFinite(projectIdNum) ? projectIdNum : undefined,
        task_id: Number.isFinite(taskIdNum) ? taskIdNum : undefined,
        date_from: dateFrom ? `${dateFrom}T00:00:00.000Z` : undefined,
        date_to: dateTo ? toIsoRangeEnd(dateTo) : undefined,
      });
      setItems(list);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  async function loadLookups() {
    try {
      const [allTasks, allProjects] = await Promise.all([
        api.listTasks({ include_archived: true }),
        api.listProjects(),
      ]);
      setTasks(allTasks);
      setProjects(allProjects);
    } catch {
      setTasks([]);
      setProjects([]);
    }
  }

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agent, projectId, taskId, dateFrom, dateTo]);

  useEffect(() => {
    void loadLookups();
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem('cb.activity.agent', agent);
      window.localStorage.setItem('cb.activity.projectId', projectId);
      window.localStorage.setItem('cb.activity.taskId', taskId);
      window.localStorage.setItem('cb.activity.dateFrom', dateFrom);
      window.localStorage.setItem('cb.activity.dateTo', dateTo);
      window.localStorage.setItem('cb.activity.q', searchText);
    } catch {
      // ignore
    }
  }, [agent, dateFrom, dateTo, projectId, searchText, taskId]);

  useEffect(() => {
    if (!searchParams.has('agent')) return;
    const fromQuery = searchParams.get('agent') ?? '';
    if (fromQuery !== agent) setAgent(fromQuery);
  }, [searchParams, agent]);

  function handleAgentChange(nextAgent: string) {
    setAgent(nextAgent);
    const next = new URLSearchParams(searchParams);
    if (nextAgent) next.set('agent', nextAgent);
    else next.delete('agent');
    setSearchParams(next, { replace: true });
  }

  useEffect(() => {
    if (!wsSignal?.type) return;
    try {
      if (wsSignal.type === 'activity_created' && wsSignal.data) {
        const a = wsSignal.data as Activity;
        setItems((prev) => {
          if (prev.some((x) => x.id === a.id)) return prev;
          return [a, ...prev].slice(0, 300);
        });
        return;
      }
      if (String(wsSignal.type).startsWith('activity_')) void refresh();
    } catch {
      void refresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wsSignal?.type]);

  const taskById = useMemo(() => new Map(tasks.map((task) => [task.id, task])), [tasks]);
  const projectById = useMemo(() => new Map(projects.map((project) => [project.id, project])), [projects]);

  const filtered = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    if (!q) return items;
    return items.filter((activity) => {
      const task = activity.related_task_id ? taskById.get(activity.related_task_id) : null;
      const details = parseDetails(activity.details);
      const haystack = [
        activity.activity_type,
        activity.description,
        task?.title ?? '',
        details.commitSummary ?? '',
        details.files.join(' '),
        details.keyDecisions.join(' '),
      ].join('\n').toLowerCase();
      return haystack.includes(q);
    });
  }, [items, searchText, taskById]);

  const groupedByTask = useMemo(() => {
    const groups = new Map<string, { key: string; taskId: number | null; rows: Activity[] }>();
    for (const activity of filtered) {
      const taskKey = activity.related_task_id ? `task:${activity.related_task_id}` : 'task:none';
      const existing = groups.get(taskKey) ?? {
        key: taskKey,
        taskId: activity.related_task_id ?? null,
        rows: [],
      };
      existing.rows.push(activity);
      groups.set(taskKey, existing);
    }

    return Array.from(groups.values()).sort((a, b) => {
      const aTs = a.rows[0]?.timestamp ? new Date(a.rows[0].timestamp).getTime() : 0;
      const bTs = b.rows[0]?.timestamp ? new Date(b.rows[0].timestamp).getTime() : 0;
      return bTs - aTs;
    });
  }, [filtered]);

  const agentOptions = useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const id of agentIds) {
      const v = String(id).trim().toLowerCase();
      if (!v || seen.has(v)) continue;
      seen.add(v);
      out.push(v);
    }
    for (const row of items) {
      const v = String(row.agent || '').trim().toLowerCase();
      if (!v || seen.has(v)) continue;
      seen.add(v);
      out.push(v);
    }
    return out.sort();
  }, [agentIds, items]);

  const projectOptions = useMemo(() => projects.map((project) => ({ id: String(project.id), name: project.name })), [projects]);
  const taskOptions = useMemo(() => {
    const selectedProjectId = Number(projectId);
    return tasks
      .filter((task) => {
        if (!Number.isFinite(selectedProjectId)) return true;
        return task.project_id === selectedProjectId;
      })
      .sort((a, b) => a.id - b.id);
  }, [projectId, tasks]);

  const agentOptionLabels = useMemo(() => {
    const out: Record<string, string> = {};
    for (const id of agentOptions) out[id] = profileForAgent(id, profileSources).displayName;
    return out;
  }, [agentOptions, profileSources]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-[rgb(var(--cb-text))]">Agent Activity</h2>
          <div className="text-sm text-[rgb(var(--cb-text-muted))]">Grouped by linked task with files, commit summaries, and decisions when available.</div>
        </div>

        <div className="flex flex-wrap gap-2">
          <select className="cb-input w-44" value={agent} onChange={(e) => handleAgentChange(e.target.value)}>
            <option value="">All agents</option>
            {agentOptions.map((id) => (
              <option key={id} value={id}>
                {agentOptionLabels[id] ?? id}
              </option>
            ))}
          </select>

          <select className="cb-input w-44" value={projectId} onChange={(e) => {
            setProjectId(e.target.value);
            setTaskId('');
          }}>
            <option value="">All projects</option>
            {projectOptions.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>

          <select className="cb-input w-56" value={taskId} onChange={(e) => setTaskId(e.target.value)}>
            <option value="">All tasks</option>
            {taskOptions.map((task) => (
              <option key={task.id} value={task.id}>
                #{task.id} {task.title}
              </option>
            ))}
          </select>

          <Input className="w-40" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          <Input className="w-40" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />

          <div className="w-72">
            <Input placeholder="Search activity, files, decisions…" value={searchText} onChange={(e) => setSearchText(e.target.value)} />
          </div>

          <Button variant="secondary" onClick={() => void refresh()} disabled={loading}>
            Refresh
          </Button>

          <Button
            variant="primary"
            disabled={ingesting}
            onClick={async () => {
              setIngesting(true);
              try {
                await api.ingestSessions();
                await Promise.all([refresh(), loadLookups()]);
              } catch (err) {
                const msg = err instanceof Error ? err.message : String(err);
                setError(msg);
              } finally {
                setIngesting(false);
              }
            }}
          >
            {ingesting ? 'Ingesting…' : 'Ingest sessions'}
          </Button>
        </div>
      </div>

      {loading ? <div className="text-sm text-[rgb(var(--cb-text-muted))]">Loading…</div> : null}
      {error ? <Panel className="border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{error}</Panel> : null}

      <div className="flex flex-col gap-3">
        {groupedByTask.map((group) => {
          const task = group.taskId ? taskById.get(group.taskId) : null;
          const project = task?.project_id ? projectById.get(task.project_id) : null;
          const groupTitle = task ? `#${task.id} ${task.title}` : 'Unlinked activity';

          return (
            <Panel key={group.key} className="p-3">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <div className="text-sm font-semibold text-[rgb(var(--cb-text))]">{groupTitle}</div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-[rgb(var(--cb-text-muted))]">
                  {project ? <span>{project.name}</span> : null}
                  {task ? <span>{task.status}</span> : null}
                  <span>{group.rows.length} event{group.rows.length === 1 ? '' : 's'}</span>
                  {task ? (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => onOpenTask?.(task.id)}
                    >
                      Open Task
                    </Button>
                  ) : null}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                {group.rows.map((activity) => {
                  const details = parseDetails(activity.details);
                  const hasDetails = details.files.length > 0 || Boolean(details.commitSummary) || details.keyDecisions.length > 0;
                  const expanded = expandedIds.has(activity.id);

                  return (
                    <div key={activity.id} className="rounded-lg border border-[rgb(var(--cb-border))] bg-[rgb(var(--cb-surface))] p-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-sm text-[rgb(var(--cb-text))]">
                          <span className="font-medium">{activity.agent}</span> • {activity.activity_type}
                        </div>
                        <div className="text-xs text-[rgb(var(--cb-text-muted))]">{when(activity.timestamp)}</div>
                      </div>
                      <div className="mt-1 text-sm text-[rgb(var(--cb-text))] opacity-90">{activity.description}</div>

                      <div className="mt-1 flex flex-wrap gap-2">
                        {activity.related_task_id ? (
                          <Button
                            size="sm"
                            variant="secondary"
                            className="font-mono"
                            onClick={() => onOpenTask?.(activity.related_task_id as number)}
                          >
                            task #{activity.related_task_id}
                          </Button>
                        ) : null}
                        {hasDetails ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setExpandedIds((prev) => {
                                const next = new Set(prev);
                                if (next.has(activity.id)) next.delete(activity.id);
                                else next.add(activity.id);
                                return next;
                              });
                            }}
                          >
                            {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            Details
                          </Button>
                        ) : null}
                      </div>

                      {expanded && hasDetails ? (
                        <div className="mt-2 rounded-md border border-[rgb(var(--cb-border))] bg-[rgb(var(--cb-surface-muted))] p-2 text-xs">
                          {details.files.length > 0 ? (
                            <div className="mb-2">
                              <div className="font-semibold text-[rgb(var(--cb-text))]">Files touched</div>
                              <div className="mt-1 flex flex-wrap gap-1">
                                {details.files.map((file) => (
                                  <span key={`${activity.id}:${file}`} className="rounded bg-[rgb(var(--cb-surface))] px-2 py-0.5 font-mono text-[rgb(var(--cb-text))]">
                                    {file}
                                  </span>
                                ))}
                              </div>
                            </div>
                          ) : null}
                          {details.commitSummary ? (
                            <div className="mb-2">
                              <div className="font-semibold text-[rgb(var(--cb-text))]">Commit summary</div>
                              <div className="mt-1 text-[rgb(var(--cb-text-muted))]">{details.commitSummary}</div>
                            </div>
                          ) : null}
                          {details.keyDecisions.length > 0 ? (
                            <div>
                              <div className="font-semibold text-[rgb(var(--cb-text))]">Key decisions</div>
                              <ul className="mt-1 list-disc pl-4 text-[rgb(var(--cb-text-muted))]">
                                {details.keyDecisions.map((decision) => (
                                  <li key={`${activity.id}:${decision}`}>{decision}</li>
                                ))}
                              </ul>
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </Panel>
          );
        })}

        {!groupedByTask.length && !loading ? (
          <div className="text-sm text-[rgb(var(--cb-text-muted))]">No activity for this filter set.</div>
        ) : null}
      </div>
    </div>
  );
}


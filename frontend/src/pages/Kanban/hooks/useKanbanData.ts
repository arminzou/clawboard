import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../../../lib/api';
import type { Task } from '../../../lib/api';

export function useKanbanData({
  currentProjectId,
  showArchived,
  refreshProjects,
}: {
  currentProjectId: number | null;
  showArchived: boolean;
  refreshProjects: () => Promise<void>;
}) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const tasksRef = useRef<Task[]>([]);
  const requestIdRef = useRef(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError(null);
    try {
      await api.discoverProjects();
      await refreshProjects();
      const params: { include_archived?: boolean; project_id?: number; non_agent?: boolean } = {
        include_archived: showArchived,
        non_agent: false,
      };
      if (currentProjectId !== null) params.project_id = currentProjectId;
      const all = await api.listTasks(params);
      if (requestIdRef.current !== requestId) return;
      setTasks(all);
    } catch (err) {
      if (requestIdRef.current !== requestId) return;
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    } finally {
      if (requestIdRef.current === requestId) setLoading(false);
    }
  }, [currentProjectId, refreshProjects, showArchived]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    tasksRef.current = tasks;
  }, [tasks]);

  return { tasks, setTasks, tasksRef, loading, error, refresh };
}

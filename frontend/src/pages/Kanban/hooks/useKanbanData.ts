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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await api.discoverProjects();
      await refreshProjects();
      const params: { include_archived?: boolean; project_id?: number } = { include_archived: showArchived };
      if (currentProjectId) params.project_id = currentProjectId;
      const all = await api.listTasks(params);
      setTasks(all);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    } finally {
      setLoading(false);
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

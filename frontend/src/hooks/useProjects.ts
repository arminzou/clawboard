import { useCallback, useEffect, useState } from 'react';
import { api, type Project } from '../lib/api';
import { useWebSocket } from './useWebSocket';
import { toast } from '../lib/toast';

export function useProjects(initialProjectId?: number | null) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [currentProjectId, setCurrentProjectIdState] = useState<number | null>(initialProjectId ?? null);

  const setCurrentProjectId = useCallback((id: number | null) => {
    setCurrentProjectIdState(id);
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.listProjects();
      setProjects(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!projects.length) return;
    if (currentProjectId === null) return;
    const exists = projects.some((p) => p.id === currentProjectId);
    if (!exists) setCurrentProjectIdState(null);
  }, [projects, currentProjectId]);

  // Listen for WebSocket updates
  useWebSocket({
    onMessage: (msg) => {
      if (msg.type === 'projects_updated') {
        console.log('[useProjects] Received projects_updated event, refreshing...', msg.data);
        const data = msg.data as { discovered?: number };
        const discovered = data?.discovered ?? 0;
        if (discovered > 0) {
          toast.success(`${discovered} new project${discovered > 1 ? 's' : ''} discovered`);
        }
        refresh();
      }
    },
  });

  useEffect(() => {
    try {
      window.localStorage.setItem('cb.v2.currentProjectId', currentProjectId === null ? 'null' : currentProjectId.toString());
    } catch {
      // ignore
    }
  }, [currentProjectId]);

  const currentProject = currentProjectId !== null ? projects.find((p) => p.id === currentProjectId) : undefined;

  return {
    projects,
    currentProjectId,
    currentProject,
    setCurrentProjectId,
    loading,
    error,
    refresh,
  };
}

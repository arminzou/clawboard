import { useCallback, useEffect, useState } from 'react';
import { api, type Project } from '../lib/api';

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [currentProjectId, setCurrentProjectIdState] = useState<number | null>(() => {
    try {
      const raw = window.localStorage.getItem('cb.v2.currentProjectId');
      if (raw === 'null' || raw === '') return null;
      return raw ? parseInt(raw, 10) : 1; // Default to project 1 (Clawboard)
    } catch {
      return 1;
    }
  });

  const setCurrentProjectId = useCallback((id: number | null) => {
    setCurrentProjectIdState(id);
  }, []);

  const refresh = async () => {
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
  };

  useEffect(() => {
    refresh();
  }, []);

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

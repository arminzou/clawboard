import { useState, useEffect } from 'react';
import { api, type OpenClawStatus } from '../lib/api';

interface Agent {
  id: string;
  name: string;
}

export function useAgents() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchAgents() {
      try {
        setLoading(true);
        const status: OpenClawStatus = await api.getOpenClawStatus();
        
        // Build deduplicated discovered agents.
        const agentMap = new Map<string, Agent>();

        // Add discovered agents
        if (status.agents && Array.isArray(status.agents)) {
          status.agents.forEach((agentId) => {
            // Use profile display name if available, else capitalize ID
            const profile = status.agentProfiles?.[agentId] || status.pluginAgentProfiles?.[agentId];
            const name = profile?.displayName || agentId.charAt(0).toUpperCase() + agentId.slice(1);
            
            agentMap.set(agentId, { id: agentId, name });
          });
        }

        setAgents(Array.from(agentMap.values()));
      } catch (err) {
        console.error('Failed to fetch agents:', err);
        setError(err instanceof Error ? err : new Error('Unknown error fetching agents'));
      } finally {
        setLoading(false);
      }
    }

    fetchAgents();
  }, []);

  return { agents, loading, error };
}

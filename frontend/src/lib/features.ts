const env = (import.meta as unknown as { env?: Record<string, unknown> }).env ?? {};

export const defaults = {
  humanId: (typeof env.VITE_HUMAN_ID === 'string' && env.VITE_HUMAN_ID.trim()) ? env.VITE_HUMAN_ID.trim() : 'armin',
};

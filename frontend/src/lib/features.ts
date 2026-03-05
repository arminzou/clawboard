function parseEnvBoolean(value: unknown): boolean {
  if (value == null) return false;
  const normalized = String(value).trim().toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on';
}

const env = (import.meta as unknown as { env?: Record<string, unknown> }).env ?? {};

export const features = {
  threadFirstV1: parseEnvBoolean(env.VITE_FEATURE_THREAD_FIRST_V1),
};

export const defaults = {
  humanId: (typeof env.VITE_HUMAN_ID === 'string' && env.VITE_HUMAN_ID.trim()) ? env.VITE_HUMAN_ID.trim() : 'armin',
};

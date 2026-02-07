/**
 * Formats a date string or object consistently across the app.
 * Output: "Jan 1, 2024" or relative time?
 * For now, let's go with a concise "MMM D, YYYY" format using native Intl.
 */
export function formatDate(input: string | Date | null | undefined): string {
  if (!input) return '';
  
  const d = typeof input === 'string' ? new Date(input.includes('T') ? input : `${input}T00:00:00`) : input;
  
  if (!Number.isFinite(d.getTime())) return '';

  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Parses SQLite timestamps which might be in "YYYY-MM-DD HH:MM:SS" format
 * into valid JS Date objects.
 */
export function parseSqliteDate(ts: string): Date {
  if (!ts) return new Date(0);
  if (ts.includes('T')) return new Date(ts);
  // Handle "2024-01-01 12:00:00" -> "2024-01-01T12:00:00Z"
  return new Date(ts.replace(' ', 'T') + 'Z');
}

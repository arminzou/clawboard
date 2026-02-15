/**
 * Formats a date string or object consistently across the app.
 * Output: "Jan 1, 2024" (MMM D, YYYY)
 */
export function formatDate(input: string | Date | null | undefined): string {
  const d = parseDate(input);
  if (!d) return '';

  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Formats a date, but if it's today, show a timestamp instead.
 * Output: "Today 3:42 PM" or "Jan 1, 2024".
 */
export function formatDateSmart(input: string | Date | null | undefined): string {
  const d = parseDate(input);
  if (!d) return '';

  const now = new Date();
  const isToday =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();

  if (isToday) {
    const time = d.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
    return `Today ${time}`;
  }

  return formatDate(d);
}

function parseDate(input: string | Date | null | undefined): Date | null {
  if (!input) return null;

  let d: Date;
  if (typeof input === 'string') {
    if (input.includes('T')) {
      d = new Date(input);
    } else if (input.includes(' ')) {
      d = parseSqliteDate(input);
    } else {
      d = new Date(`${input}T00:00:00`);
    }
  } else {
    d = input;
  }

  if (!Number.isFinite(d.getTime())) return null;
  return d;
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

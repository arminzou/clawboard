/**
 * Formats a date string or object consistently across the app.
 * Output: "Jan 1, 2024" (MMM D, YYYY) or "Jan 1" if current year.
 */
export function formatDate(input: string | Date | null | undefined): string {
  const d = parseDate(input);
  if (!d) return '';

  const now = new Date();
  const includeYear = d.getFullYear() !== now.getFullYear();

  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    ...(includeYear ? { year: 'numeric' } : {}),
  });
}

/**
 * Formats a date with date + time.
 * Output: "Jan 1 16:42" or "Jan 1, 2024 16:42".
 */
export function formatDateTimeSmart(input: string | Date | null | undefined): string {
  return formatDateTime(input);
}

export function formatRelativeTime(input: string | Date | null | undefined): string {
  const d = parseDate(input);
  if (!d) return '';

  const now = new Date();
  const diffMs = d.getTime() - now.getTime();
  const diffSeconds = Math.round(diffMs / 1000);
  const absSeconds = Math.abs(diffSeconds);

  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

  if (absSeconds < 60) {
    return rtf.format(diffSeconds, 'second');
  }

  const diffMinutes = Math.round(diffSeconds / 60);
  if (Math.abs(diffMinutes) < 60) {
    return rtf.format(diffMinutes, 'minute');
  }

  const diffHours = Math.round(diffMinutes / 60);
  if (Math.abs(diffHours) < 24) {
    return rtf.format(diffHours, 'hour');
  }

  const diffDays = Math.round(diffHours / 24);
  if (Math.abs(diffDays) < 1) {
    return rtf.format(diffDays, 'day');
  }

  return formatDateTimeFull(d);
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

/**
 * Formats a date with local date + time.
 * Output: "Jan 1, 2024 16:42" (omit year if current year).
 */
export function formatDateTime(input: string | Date | null | undefined): string {
  const d = parseDate(input);
  if (!d) return '';

  const now = new Date();
  const includeYear = d.getFullYear() !== now.getFullYear();

  return formatDateTimeWithYear(d, includeYear);
}

/**
 * Formats a date with local date + time, always including year.
 * Output: "Jan 1, 2024 16:42".
 */
export function formatDateTimeFull(input: string | Date | null | undefined): string {
  const d = parseDate(input);
  if (!d) return '';

  return formatDateTimeWithYear(d, true);
}

function formatDateTimeWithYear(d: Date, includeYear: boolean): string {
  const date = d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    ...(includeYear ? { year: 'numeric' } : {}),
  });
  const time = d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  return `${date} ${time}`;
}

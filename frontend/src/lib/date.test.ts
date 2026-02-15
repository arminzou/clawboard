import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { formatDate, formatDateSmart, formatDateTime } from './date';

describe('date formatting', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('formats today with time', () => {
    const now = new Date(2026, 1, 15, 12, 0, 0);
    vi.setSystemTime(now);

    const input = new Date(2026, 1, 15, 9, 30, 0);
    const expectedTime = input.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });

    expect(formatDateSmart(input)).toBe(`Today ${expectedTime}`);
  });

  it('formats non-today with date', () => {
    const now = new Date(2026, 1, 15, 12, 0, 0);
    vi.setSystemTime(now);

    const input = new Date(2026, 1, 14, 9, 30, 0);
    expect(formatDateSmart(input)).toBe(formatDate(input));
  });

  it('formats sqlite timestamp with local date/time', () => {
    const now = new Date(2026, 1, 15, 12, 0, 0);
    vi.setSystemTime(now);

    const input = '2026-02-15 09:30:00';
    const parsed = new Date('2026-02-15T09:30:00Z');
    const expectedDate = parsed.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    const expectedTime = parsed.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });

    expect(formatDateTime(input)).toBe(`${expectedDate} ${expectedTime}`);
  });

  it('returns empty string for invalid input', () => {
    expect(formatDateSmart('nope')).toBe('');
    expect(formatDateTime(null)).toBe('');
  });
});

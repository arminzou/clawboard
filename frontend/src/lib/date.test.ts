import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { formatDate, formatDateTime, formatDateTimeFull, formatDateTimeSmart, formatRelativeTime } from './date';

describe('date formatting', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('formats today with date + time', () => {
    const now = new Date(2026, 1, 15, 12, 0, 0);
    vi.setSystemTime(now);

    const input = new Date(2026, 1, 15, 9, 30, 0);
    expect(formatDateTimeSmart(input)).toBe(formatDateTime(input));
  });

  it('formats non-today with date + time', () => {
    const now = new Date(2026, 1, 15, 12, 0, 0);
    vi.setSystemTime(now);

    const input = new Date(2026, 1, 14, 9, 30, 0);
    expect(formatDateTimeSmart(input)).toBe(formatDateTime(input));
  });

  it('formats relative time for recent updates', () => {
    const now = new Date(2026, 1, 15, 12, 0, 0);
    vi.setSystemTime(now);

    const input = new Date(2026, 1, 15, 11, 50, 0);
    expect(formatRelativeTime(input)).toBe('10 minutes ago');
  });

  it('falls back to full absolute time after 24h', () => {
    const now = new Date(2026, 1, 15, 12, 0, 0);
    vi.setSystemTime(now);

    const input = new Date(2026, 1, 14, 10, 0, 0);
    expect(formatRelativeTime(input)).toBe(formatDateTimeFull(input));
  });

  it('formats sqlite timestamp with local date/time', () => {
    const now = new Date(2026, 1, 15, 12, 0, 0);
    vi.setSystemTime(now);

    const input = '2026-02-15 09:30:00';
    const parsed = new Date('2026-02-15T09:30:00Z');
    const expectedDate = parsed.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
    const expectedTime = parsed.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });

    expect(formatDateTime(input)).toBe(`${expectedDate} ${expectedTime}`);
  });

  it('formats full date/time with year', () => {
    const now = new Date(2026, 1, 15, 12, 0, 0);
    vi.setSystemTime(now);

    const input = new Date(2026, 1, 15, 9, 30, 0);
    const expectedDate = input.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    const expectedTime = input.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });

    expect(formatDateTimeFull(input)).toBe(`${expectedDate} ${expectedTime}`);
  });

  it('returns empty string for invalid input', () => {
    expect(formatDateTimeSmart('nope')).toBe('');
    expect(formatDateTime(null)).toBe('');
  });
});

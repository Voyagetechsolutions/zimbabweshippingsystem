import { describe, it, expect, vi } from 'vitest';

vi.mock('./supabase', () => ({ supabase: { from: () => ({}) } }));

import { collectionDateText } from './collectionSchedule';

describe('collectionDateText', () => {
  it('formats the shape bookings normally store', () => {
    expect(collectionDateText('September 24th, 2026')).toBe('Thu 24 Sept');
    expect(collectionDateText('July 31st, 2026')).toContain('31');
    expect(collectionDateText('2026-09-24')).toContain('24');
  });

  it('refuses a truncated date instead of guessing at one', () => {
    // A real live row holds exactly "24th" — no month, no year.
    expect(collectionDateText('24th')).toBeNull();
    expect(collectionDateText('24')).toBeNull();
    expect(collectionDateText('September')).toBeNull();
  });

  it('refuses prose that merely contains a year', () => {
    // The dangerous case: new Date('sometime in 2026') does not fail, it
    // returns 1 January 2026, which would show as a real collection date.
    expect(new Date('sometime in 2026').getFullYear()).toBe(2026);
    expect(collectionDateText('sometime in 2026')).toBeNull();
  });

  it('treats placeholders and blanks as no date', () => {
    for (const value of ['To be confirmed', 'To be assigned', 'TBC', 'n/a', '', '   ', null, undefined]) {
      expect(collectionDateText(value)).toBeNull();
    }
  });
});

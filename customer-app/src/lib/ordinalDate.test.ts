import { describe, it, expect } from 'vitest';
import { ordinalDate, parseCollectionDate, isoDay } from './format';

/**
 * These two have to be exact inverses. The label the app sends becomes
 * `metadata.collection.date`, and the server parses it back to work out which
 * consignment the shipment belongs to — a spelling it cannot read files the
 * booking under the month it was taken instead of the month it ships.
 */
describe('ordinalDate', () => {
  it('spells the suffixes the way the database does', () => {
    const on = (iso: string) => {
      const [y, m, d] = iso.split('-').map(Number);
      return new Date(y, m - 1, d);
    };
    expect(ordinalDate(on('2026-09-01'))).toBe('September 1st, 2026');
    expect(ordinalDate(on('2026-09-02'))).toBe('September 2nd, 2026');
    expect(ordinalDate(on('2026-09-03'))).toBe('September 3rd, 2026');
    expect(ordinalDate(on('2026-09-11'))).toBe('September 11th, 2026');
    expect(ordinalDate(on('2026-09-12'))).toBe('September 12th, 2026');
    expect(ordinalDate(on('2026-09-13'))).toBe('September 13th, 2026');
    expect(ordinalDate(on('2026-09-21'))).toBe('September 21st, 2026');
    expect(ordinalDate(on('2026-09-22'))).toBe('September 22nd, 2026');
    expect(ordinalDate(on('2026-09-23'))).toBe('September 23rd, 2026');
    expect(ordinalDate(on('2026-10-31'))).toBe('October 31st, 2026');
    expect(ordinalDate(on('2026-11-01'))).toBe('November 1st, 2026');
  });

  it('round-trips every day of two years', () => {
    const day = new Date(2026, 0, 1);
    let checked = 0;
    while (day.getFullYear() < 2028) {
      const label = ordinalDate(day);
      const parsed = parseCollectionDate(label);
      expect(parsed, label).not.toBeNull();
      expect(isoDay(parsed!), label).toBe(isoDay(day));
      day.setDate(day.getDate() + 1);
      checked += 1;
    }
    expect(checked).toBe(730);
  });
});

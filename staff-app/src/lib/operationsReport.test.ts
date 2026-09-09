import { describe, expect, it, vi } from 'vitest';

// The module fetches through the Supabase client, which vitest cannot parse in
// this project — the same reason shipmentSearch.test.ts mocks it. Only the pure
// chart maths is under test here; the fetchers are thin wrappers over an RPC.
vi.mock('./supabase', () => ({ supabase: { rpc: () => ({}) } }));

import { barFractions, pieSlices, symbolFor } from './operationsReport';

describe('barFractions', () => {
  it('sizes every bar against the largest', () => {
    expect(barFractions([10, 5, 0], (v) => v)).toEqual([1, 0.5, 0]);
  });

  it('draws nothing when every value is zero', () => {
    // A chart of all-zero revenue must read as empty, not as full bars.
    expect(barFractions([0, 0], (v) => v)).toEqual([0, 0]);
  });

  it('treats negatives and nonsense as zero rather than drawing backwards', () => {
    expect(barFractions([-5, 10, NaN as any], (v) => v)).toEqual([0, 1, 0]);
  });

  it('handles an empty set', () => {
    expect(barFractions([], (v: number) => v)).toEqual([]);
  });
});

describe('pieSlices', () => {
  it('splits proportionally', () => {
    const slices = pieSlices([3, 1], (v) => v);
    expect(slices[0]).toEqual({ start: 0, end: 0.75 });
    expect(slices[1].start).toBe(0.75);
  });

  it('always closes the circle exactly', () => {
    // Thirds do not divide cleanly; the last slice absorbs the remainder so
    // there is never a hairline gap where the pie should meet itself.
    const slices = pieSlices([1, 1, 1], (v) => v);
    expect(slices[slices.length - 1].end).toBe(1);
  });

  it('produces no slices at all when there is nothing to divide', () => {
    expect(pieSlices([0, 0], (v) => v)).toEqual([{ start: 0, end: 0 }, { start: 0, end: 0 }]);
  });

  it('ignores negative values instead of reversing a slice', () => {
    const slices = pieSlices([-4, 2], (v) => v);
    expect(slices[0]).toEqual({ start: 0, end: 0 });
    expect(slices[1].end).toBe(1);
  });
});

describe('symbolFor', () => {
  it('knows the two currencies the business trades in', () => {
    expect(symbolFor('GBP')).toBe('£');
    expect(symbolFor('EUR')).toBe('€');
  });

  it('falls back to the code rather than guessing a symbol', () => {
    expect(symbolFor('USD')).toBe('USD ');
  });
});

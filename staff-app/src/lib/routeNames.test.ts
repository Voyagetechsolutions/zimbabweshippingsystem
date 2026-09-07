import { describe, it, expect, vi } from 'vitest';

// collections.ts reaches for supabase (and through it React Native), which does
// not exist in a jsdom run. Only the pure name handling is under test here.
vi.mock('./supabase', () => ({ supabase: { from: () => ({}), rpc: async () => ({ data: null, error: null }) } }));

import { addRouteName, isPlaceholderRoute, routeKey } from './collections';

describe('routeKey', () => {
  it('treats a route and its "ROUTE" suffix as the same thing', () => {
    // The published schedule and the bookings on it spell it differently.
    expect(routeKey('NORTHAMPTON ROUTE')).toBe(routeKey('Northampton'));
    expect(routeKey('  belfast route  ')).toBe('BELFAST');
  });

  it('only strips a trailing ROUTE, not one inside the name', () => {
    expect(routeKey('ROUTE 66')).toBe('ROUTE 66');
  });
});

describe('isPlaceholderRoute', () => {
  it('recognises the placeholders live bookings actually carry', () => {
    for (const value of ['To be assigned', 'to be confirmed', 'TBC', 'n/a', 'None', 'unknown', '-', '—', '', '   ', null, undefined]) {
      expect(isPlaceholderRoute(value)).toBe(true);
    }
  });

  it('leaves real route names alone', () => {
    for (const value of ['NORTHAMPTON ROUTE', 'Belfast', 'LONDONDERRY']) {
      expect(isPlaceholderRoute(value)).toBe(false);
    }
  });
});

describe('addRouteName', () => {
  it('collapses the two spellings of one route into a single entry', () => {
    // This is the bug as seen on screen: one day offered "WORK NORTHAMPTON
    // ROUTE", "WORK NORTHAMPTON" and "WORK To be assigned" — three buttons for
    // one route and a placeholder.
    const day = { routes: [] as string[] };
    addRouteName(day, 'NORTHAMPTON ROUTE');
    addRouteName(day, 'NORTHAMPTON');
    addRouteName(day, 'To be assigned');
    expect(day.routes).toEqual(['NORTHAMPTON ROUTE']);
  });

  it('keeps the published name even when the short one arrives first', () => {
    const day = { routes: [] as string[] };
    addRouteName(day, 'Northampton');
    addRouteName(day, 'NORTHAMPTON ROUTE');
    expect(day.routes).toEqual(['NORTHAMPTON ROUTE']);
  });

  it('keeps genuinely different routes apart', () => {
    const day = { routes: [] as string[] };
    addRouteName(day, 'NORTHAMPTON ROUTE');
    addRouteName(day, 'BELFAST ROUTE');
    expect(day.routes).toEqual(['NORTHAMPTON ROUTE', 'BELFAST ROUTE']);
  });

  it('never adds a placeholder, whatever order things arrive in', () => {
    const day = { routes: [] as string[] };
    addRouteName(day, 'To be assigned');
    addRouteName(day, null);
    addRouteName(day, '   ');
    expect(day.routes).toEqual([]);
  });
});

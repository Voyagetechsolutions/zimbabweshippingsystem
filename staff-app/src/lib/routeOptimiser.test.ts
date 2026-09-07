import { describe, it, expect } from 'vitest';
import { distanceKm, isUsablePoint, moveStop, optimiseRoute, type RoutePoint } from './routeOptimiser';

const point = (latitude: number, longitude: number): RoutePoint => ({ latitude, longitude });

// Real places, so the distances can be sanity-checked against a map.
const MANCHESTER = point(53.4808, -2.2426);
const LEEDS = point(53.8008, -1.5491);
const SHEFFIELD = point(53.3811, -1.4701);
const LIVERPOOL = point(53.4084, -2.9916);
const BIRMINGHAM = point(52.4862, -1.8904);

describe('distanceKm', () => {
  it('matches a known distance', () => {
    // Manchester to Leeds is about 58 km as the crow flies.
    expect(distanceKm(MANCHESTER, LEEDS)).toBeGreaterThan(55);
    expect(distanceKm(MANCHESTER, LEEDS)).toBeLessThan(62);
  });

  it('is zero for the same point and symmetric', () => {
    expect(distanceKm(LEEDS, LEEDS)).toBe(0);
    expect(distanceKm(LEEDS, SHEFFIELD)).toBeCloseTo(distanceKm(SHEFFIELD, LEEDS), 9);
  });
});

describe('isUsablePoint', () => {
  it('rejects null island, out-of-range and non-finite values', () => {
    expect(isUsablePoint(point(0, 0))).toBe(false);
    expect(isUsablePoint(point(91, 0))).toBe(false);
    expect(isUsablePoint(point(0, 181))).toBe(false);
    expect(isUsablePoint(point(NaN, 1))).toBe(false);
    expect(isUsablePoint(null)).toBe(false);
    expect(isUsablePoint(undefined)).toBe(false);
  });

  it('accepts a real coordinate', () => {
    expect(isUsablePoint(MANCHESTER)).toBe(true);
  });
});

describe('optimiseRoute', () => {
  type Stop = { id: string; at: RoutePoint | null };
  const pointOf = (s: Stop) => s.at;

  it('finds the shortest total route, not merely the nearest next stop', () => {
    // Greedy would open with Liverpool because it is closest to Manchester,
    // and then have to cross the country twice. The shortest route overall
    // opens with Leeds, which is what 2-opt is here to find.
    const stops: Stop[] = [
      { id: 'birmingham', at: BIRMINGHAM },
      { id: 'leeds', at: LEEDS },
      { id: 'liverpool', at: LIVERPOOL },
    ];
    const result = optimiseRoute(MANCHESTER, stops, pointOf);
    expect(result.unplaceable).toEqual([]);

    // Brute-force every permutation and confirm we matched the true optimum.
    const permutations = <A,>(xs: A[]): A[][] =>
      xs.length <= 1 ? [xs] : xs.flatMap((x, i) =>
        permutations([...xs.slice(0, i), ...xs.slice(i + 1)]).map((rest) => [x, ...rest]));

    const lengthOf = (order: Stop[]) => {
      let total = 0;
      let cursor: RoutePoint = MANCHESTER;
      for (const stop of order) {
        total += distanceKm(cursor, stop.at as RoutePoint);
        cursor = stop.at as RoutePoint;
      }
      return total;
    };

    const best = Math.min(...permutations(stops).map(lengthOf));
    expect(result.straightLineKm).toBeCloseTo(best, 6);
    expect(lengthOf(result.ordered)).toBeCloseTo(best, 6);
  });

  it('keeps every stop exactly once', () => {
    const stops: Stop[] = [
      { id: 'a', at: LEEDS },
      { id: 'b', at: SHEFFIELD },
      { id: 'c', at: LIVERPOOL },
      { id: 'd', at: BIRMINGHAM },
    ];
    const result = optimiseRoute(MANCHESTER, stops, pointOf);
    expect(result.ordered.map((s) => s.id).sort()).toEqual(['a', 'b', 'c', 'd']);
  });

  it('separates stops that could not be geocoded instead of dropping them', () => {
    const stops: Stop[] = [
      { id: 'placed', at: LEEDS },
      { id: 'no-point', at: null },
      { id: 'null-island', at: point(0, 0) },
    ];
    const result = optimiseRoute(MANCHESTER, stops, pointOf);
    expect(result.ordered.map((s) => s.id)).toEqual(['placed']);
    expect(result.unplaceable.map((s) => s.id)).toEqual(['no-point', 'null-island']);
  });

  it('beats the booking order on a route designed to trip up nearest-neighbour', () => {
    // Two clusters. Booking order zig-zags between them; a good route does each
    // cluster in turn.
    const west = [point(53.40, -2.99), point(53.41, -2.98), point(53.42, -2.97)];
    const east = [point(53.80, -1.55), point(53.81, -1.54), point(53.82, -1.53)];
    const stops: Stop[] = [
      { id: 'w0', at: west[0] }, { id: 'e0', at: east[0] },
      { id: 'w1', at: west[1] }, { id: 'e1', at: east[1] },
      { id: 'w2', at: west[2] }, { id: 'e2', at: east[2] },
    ];

    const result = optimiseRoute(MANCHESTER, stops, pointOf);

    // Length of the route as booked, from the same start.
    let booked = 0;
    let cursor: RoutePoint = MANCHESTER;
    for (const stop of stops) {
      booked += distanceKm(cursor, stop.at as RoutePoint);
      cursor = stop.at as RoutePoint;
    }

    expect(result.straightLineKm).toBeLessThan(booked);
    // Each cluster should be contiguous rather than interleaved.
    const sides = result.ordered.map((s) => s.id[0]);
    const changes = sides.filter((side, i) => i > 0 && side !== sides[i - 1]).length;
    expect(changes).toBe(1);
  });

  it('still orders sensibly with no start location', () => {
    const stops: Stop[] = [
      { id: 'leeds', at: LEEDS },
      { id: 'sheffield', at: SHEFFIELD },
      { id: 'liverpool', at: LIVERPOOL },
    ];
    const result = optimiseRoute(null, stops, pointOf);
    expect(result.ordered).toHaveLength(3);
    // Anchored on the first placeable stop, so that one leads.
    expect(result.ordered[0].id).toBe('leeds');
  });

  it('handles empty and single-stop routes', () => {
    expect(optimiseRoute(MANCHESTER, [], pointOf).ordered).toEqual([]);
    const one: Stop[] = [{ id: 'only', at: LEEDS }];
    const result = optimiseRoute(MANCHESTER, one, pointOf);
    expect(result.ordered.map((s) => s.id)).toEqual(['only']);
    expect(result.straightLineKm).toBe(0);
  });
});

describe('moveStop', () => {
  const list = ['a', 'b', 'c', 'd'];

  it('moves a stop to the front, which is the case drivers actually use', () => {
    expect(moveStop(list, 3, 0)).toEqual(['d', 'a', 'b', 'c']);
  });

  it('moves a stop backwards', () => {
    expect(moveStop(list, 0, 2)).toEqual(['b', 'c', 'a', 'd']);
  });

  it('returns the list unchanged when the position does not change', () => {
    expect(moveStop(list, 1, 1)).toBe(list);
    expect(moveStop([], 0, 1)).toEqual([]);
  });

  it('clamps a drag that ends past the end of the list', () => {
    expect(moveStop(list, 0, 99)).toEqual(['b', 'c', 'd', 'a']);
    expect(moveStop(list, -5, 1)).toEqual(['b', 'a', 'c', 'd']);
  });

  it('does not mutate the input', () => {
    const original = [...list];
    moveStop(list, 0, 3);
    expect(list).toEqual(original);
  });
});

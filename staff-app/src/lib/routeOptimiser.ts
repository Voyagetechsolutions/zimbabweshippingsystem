/**
 * Orders a day's collections into a sensible driving sequence, on the phone.
 *
 * Deliberately free and offline: nearest-neighbour to get a decent order, then
 * 2-opt to untangle it, both over straight-line (haversine) distance. At the
 * 10-30 stops a driver actually has, this lands within a few percent of the
 * true optimum and runs in single-digit milliseconds, with no API key, no
 * per-request billing and no signal required.
 *
 * What it is not: road distance. A river, a motorway junction or a one-way
 * system can make two points that are 400 m apart a ten-minute drive. The
 * ordering is therefore a strong suggestion, not gospel — which is exactly why
 * the driver can drag any stop to any position afterwards. Distances are
 * returned as `straightLineKm`, named so no screen can accidentally present
 * them as "distance to drive".
 *
 * Swapping in a real road-distance matrix later means replacing `distanceKm`
 * with a lookup into a fetched matrix; nothing else here needs to change.
 */

export type RoutePoint = { latitude: number; longitude: number };

export type OptimisedRoute<T> = {
  /** Stops in the order they should be driven. */
  ordered: T[];
  /**
   * Stops with no usable coordinates, kept separate rather than dropped: a
   * shipment that failed geocoding is still work the driver has to do, and
   * hiding it would quietly lose a collection.
   */
  unplaceable: T[];
  straightLineKm: number;
};

const EARTH_RADIUS_KM = 6371;
const toRad = (deg: number) => (deg * Math.PI) / 180;

/** Great-circle distance in kilometres. */
export function distanceKm(a: RoutePoint, b: RoutePoint): number {
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * A point is usable only if both halves are finite numbers in range and it is
 * not (0, 0) — null island is what an empty form produces, and it would drag
 * the whole route into the Atlantic.
 */
export function isUsablePoint(point: RoutePoint | null | undefined): point is RoutePoint {
  if (!point) return false;
  const { latitude, longitude } = point;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return false;
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return false;
  if (latitude === 0 && longitude === 0) return false;
  return true;
}

/** Total length of a path that starts at `start` and visits `points` in order. */
function pathLength(start: RoutePoint | null, points: RoutePoint[]): number {
  let total = 0;
  let previous = start;
  for (const point of points) {
    if (previous) total += distanceKm(previous, point);
    previous = point;
  }
  return total;
}

/** Greedy first pass: repeatedly hop to the closest stop not yet visited. */
function nearestNeighbour(start: RoutePoint, points: RoutePoint[]): number[] {
  const remaining = points.map((_, index) => index);
  const order: number[] = [];
  let cursor = start;

  while (remaining.length) {
    let bestAt = 0;
    let bestDistance = Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const candidate = distanceKm(cursor, points[remaining[i]]);
      if (candidate < bestDistance) {
        bestDistance = candidate;
        bestAt = i;
      }
    }
    const [chosen] = remaining.splice(bestAt, 1);
    order.push(chosen);
    cursor = points[chosen];
  }

  return order;
}

/**
 * 2-opt on an open path: reverse any segment whose reversal shortens the route,
 * until nothing improves.
 *
 * Nearest-neighbour reliably strands one far stop and then crosses the route to
 * reach it; this is what removes those crossings. The path is open because the
 * driver does not return to where they started — there is no depot in the data.
 */
function twoOpt(start: RoutePoint, points: RoutePoint[], order: number[]): number[] {
  const n = order.length;
  if (n < 3) return order;

  const result = order.slice();
  const at = (i: number) => points[result[i]];
  // Generous but finite: without a cap a pathological set could spin, and a
  // driver waiting on a spinner is worse than a slightly longer route.
  const maxPasses = 40;

  for (let pass = 0; pass < maxPasses; pass++) {
    let improved = false;

    for (let i = 0; i < n - 1; i++) {
      for (let j = i + 1; j < n; j++) {
        const before = i === 0 ? start : at(i - 1);
        const first = at(i);
        const last = at(j);
        const after = j + 1 < n ? at(j + 1) : null;

        const currentCost = distanceKm(before, first) + (after ? distanceKm(last, after) : 0);
        const swappedCost = distanceKm(before, last) + (after ? distanceKm(first, after) : 0);

        // A small epsilon stops floating-point noise from looping forever on
        // two routes of identical length.
        if (swappedCost < currentCost - 1e-9) {
          let lo = i;
          let hi = j;
          while (lo < hi) {
            const swap = result[lo];
            result[lo] = result[hi];
            result[hi] = swap;
            lo++;
            hi--;
          }
          improved = true;
        }
      }
    }

    if (!improved) break;
  }

  return result;
}

/**
 * Order `items` for driving, starting from `start` (the driver's location).
 *
 * With no start location — permission refused, no fix indoors — the first
 * placeable stop anchors the route and the rest are ordered from there, which
 * still beats booking order. Original order is preserved for anything that
 * cannot be placed.
 */
export function optimiseRoute<T>(
  start: RoutePoint | null,
  items: T[],
  pointOf: (item: T) => RoutePoint | null | undefined,
): OptimisedRoute<T> {
  const placeable: T[] = [];
  const points: RoutePoint[] = [];
  const unplaceable: T[] = [];

  for (const item of items) {
    const point = pointOf(item);
    if (isUsablePoint(point)) {
      placeable.push(item);
      points.push({ latitude: point.latitude, longitude: point.longitude });
    } else {
      unplaceable.push(item);
    }
  }

  if (placeable.length <= 1) {
    return { ordered: placeable, unplaceable, straightLineKm: 0 };
  }

  const anchor = isUsablePoint(start) ? start : points[0];
  const seeded = nearestNeighbour(anchor, points);
  const improved = twoOpt(anchor, points, seeded);

  return {
    ordered: improved.map((index) => placeable[index]),
    unplaceable,
    straightLineKm: pathLength(anchor, improved.map((index) => points[index])),
  };
}

/**
 * Move a stop from one position to another, the way a drag-and-drop list does.
 *
 * Kept here beside the optimiser because reordering is the driver's override of
 * it, and both have to agree on what "the order" is. Out-of-range indices are
 * clamped rather than throwing: a gesture that ends off the end of the list is
 * a normal thing for a driver to do on a moving van, not an error.
 */
export function moveStop<T>(items: T[], from: number, to: number): T[] {
  if (!items.length) return items;
  const last = items.length - 1;
  const source = Math.max(0, Math.min(last, from));
  const target = Math.max(0, Math.min(last, to));
  if (source === target) return items;

  const next = items.slice();
  const [moved] = next.splice(source, 1);
  next.splice(target, 0, moved);
  return next;
}

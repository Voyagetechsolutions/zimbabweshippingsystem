import { supabase } from './supabase';

/**
 * Which collection route serves a postcode.
 *
 * The website decides a booking's route from the pickup postcode, using the
 * prefix table in `app_configuration.uk_route_coverage`. The staff app knew
 * nothing about it: admin could correct a customer's postcode during the
 * confirmation call and the shipment would keep whatever route the *original*
 * postcode had chosen — so a booking moved from NN to B stayed on the
 * Northampton round and the Birmingham driver never saw it.
 *
 * This is the same mapping, read from the same place, so an address corrected
 * in the office lands on the round the website would have chosen for it.
 *
 * Ireland has no usable postcode (Eircodes are absent from bookings), so Irish
 * routes are matched on the town instead, exactly as the website does.
 */

export type RouteMatch = {
  route: string;
  /** The prefix or town that matched, for showing staff *why*. */
  matchedOn: string;
};

type Coverage = {
  routes: Array<{ route: string; prefixes?: string[] }>;
  restrictedPrefixes?: string[];
};

let ukPrefixes: Array<{ prefix: string; route: string }> = [];
let irelandTowns: Array<{ town: string; route: string }> = [];
let restricted: string[] = [];
let loadedAt = 0;

const CACHE_MS = 5 * 60 * 1000;

/** Uppercase, no spaces — the shape prefixes are stored in. */
export const normalisePostcode = (value: string | null | undefined) =>
  String(value ?? '').toUpperCase().replace(/\s+/g, '');

export async function loadRouteCoverage(force = false): Promise<void> {
  if (!force && ukPrefixes.length && Date.now() - loadedAt < CACHE_MS) return;

  const [{ data: config }, { data: schedules }] = await Promise.all([
    supabase.rpc('get_app_configuration'),
    supabase.from('collection_schedules').select('route,country,areas').limit(300),
  ]);

  const coverage: Coverage = ((config as any)?.configuration?.uk_route_coverage) || { routes: [] };
  restricted = (coverage.restrictedPrefixes || []).map((p) => String(p).toUpperCase());

  ukPrefixes = [];
  for (const row of coverage.routes || []) {
    for (const prefix of row.prefixes || []) {
      const key = String(prefix).toUpperCase().trim();
      if (key) ukPrefixes.push({ prefix: key, route: row.route });
    }
  }
  // Longest prefix first: "BT" must beat "B" for a Belfast postcode.
  ukPrefixes.sort((a, b) => b.prefix.length - a.prefix.length);

  irelandTowns = [];
  for (const schedule of (schedules as any[]) || []) {
    if (!String(schedule.country || '').toLowerCase().includes('ireland')) continue;
    for (const area of Array.isArray(schedule.areas) ? schedule.areas : []) {
      const town = String(area).trim();
      // The website skips these too — they are a note, not a place.
      if (!town || town.startsWith('Postcodes:')) continue;
      irelandTowns.push({ town: town.toUpperCase(), route: schedule.route });
    }
  }

  loadedAt = Date.now();
}

/**
 * The route for a UK postcode, or null when we do not collect there.
 *
 * A restricted prefix returns null rather than a route: those are areas the
 * business has decided not to serve, and quietly assigning one a round would
 * put a stop on a driver's day that nobody intends to drive.
 */
export function routeForPostcode(postcode: string | null | undefined): RouteMatch | null {
  const formatted = normalisePostcode(postcode);
  if (!formatted) return null;
  const areaPrefix = formatted.match(/^[A-Z]{1,2}/)?.[0] || '';
  if (!areaPrefix || restricted.includes(areaPrefix)) return null;
  const hit = ukPrefixes.find((row) => formatted.startsWith(row.prefix));
  return hit ? { route: hit.route, matchedOn: hit.prefix } : null;
}

/** The route for an Irish town, matched the way the website matches it. */
export function routeForIrishTown(city: string | null | undefined): RouteMatch | null {
  const town = String(city ?? '').trim().toUpperCase();
  if (!town) return null;
  const hit = irelandTowns.find((row) => row.town === town)
    || irelandTowns.find((row) => town.includes(row.town) || row.town.includes(town));
  return hit ? { route: hit.route, matchedOn: hit.town } : null;
}

/**
 * The route for an address, whichever country it is in.
 *
 * Ireland first when the country says so, because an Irish address may still
 * carry something postcode-shaped that would match a UK prefix by accident.
 */
export function routeForAddress(input: {
  postcode?: string | null;
  city?: string | null;
  country?: string | null;
}): RouteMatch | null {
  const country = String(input.country ?? '').toLowerCase();
  if (country.includes('ireland') || country === 'eire' || country === 'éire') {
    return routeForIrishTown(input.city);
  }
  return routeForPostcode(input.postcode);
}

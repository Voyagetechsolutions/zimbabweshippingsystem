import { supabase } from './supabase';

/**
 * Today's active collection route, for every driver on shift.
 *
 * Only one collection route runs per day, so drivers are not assigned
 * individual stops — whoever is clocked in sees the whole route and works the
 * nearest address first.
 *
 * Coordinates come from three places, cheapest first:
 *   1. a planned run stop, if dispatch built one
 *   2. `shipments.pickup_latitude/longitude`, cached by whichever driver
 *      resolved that postcode first
 *   3. postcodes.io, in one bulk request for everything still unknown — the
 *      result is written back so the next driver doesn't repeat the lookup
 */

export type RouteCollection = {
  shipmentId: string;
  trackingNumber: string | null;
  customerReference: string | null;
  customerName: string;
  phone: string | null;
  address: string | null;
  city: string;
  postcode: string;
  route: string | null;
  country: 'United Kingdom' | 'Ireland' | string | null;
  goodsDescription: string | null;
  collectionStatus: string | null;
  latitude: number | null;
  longitude: number | null;
  stopId: string | null;
  runId?: string | null;
  claimId: string | null;
  claimStatus: 'available' | 'claimed' | 'en_route' | 'arrived' | 'completed' | 'failed' | 'released';
  claimedBy: string | null;
  claimedByName: string | null;
  claimedAt: string | null;
  /** Kilometres from the driver, once a location is known. */
  distanceKm?: number | null;
};

export type ActiveRoute = {
  scheduleId: string;
  route: string;
  country: string | null;
  pickupDate: string;
};

export type RouteDay = { date: string; routes: ActiveRoute[]; collections: RouteCollection[] };

/** Great-circle distance in km. Good enough to order a day's drops. */
export function distanceKm(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number },
): number {
  const R = 6371;
  const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
  const dLon = ((b.longitude - a.longitude) * Math.PI) / 180;
  const lat1 = (a.latitude * Math.PI) / 180;
  const lat2 = (b.latitude * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

const normalise = (postcode: string) => postcode.toUpperCase().replace(/[^A-Z0-9]/g, '');

/**
 * Resolve many UK postcodes in one request (postcodes.io allows 100 per call,
 * no API key). Returns only those it could place.
 */
export async function bulkLookupPostcodes(
  postcodes: string[],
): Promise<Record<string, { latitude: number; longitude: number }>> {
  const wanted = [...new Set(postcodes.map(normalise).filter((p) => p.length >= 5))];
  if (wanted.length === 0) return {};

  const found: Record<string, { latitude: number; longitude: number }> = {};
  for (let i = 0; i < wanted.length; i += 100) {
    const batch = wanted.slice(i, i + 100);
    try {
      const response = await fetch('https://api.postcodes.io/postcodes', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ postcodes: batch }),
      });
      if (!response.ok) continue;
      const json = await response.json();
      for (const row of json?.result || []) {
        const r = row?.result;
        if (typeof r?.latitude === 'number' && typeof r?.longitude === 'number') {
          found[normalise(row.query)] = { latitude: r.latitude, longitude: r.longitude };
        }
      }
    } catch {
      // Offline or rate limited: the list still works, just without pins.
    }
  }
  return found;
}

/** Strip the ordinal suffix live data uses ("August 5th, 2026") so it parses. */
function parseScheduleDate(text: string | null | undefined): Date | null {
  if (!text) return null;
  const cleaned = String(text).replace(/(\d+)(st|nd|rd|th)/gi, '$1');
  const parsed = new Date(cleaned);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

/** Route names are stored with and without the " ROUTE" suffix. */
const routeKey = (name: string | null | undefined) =>
  String(name || '').toUpperCase().replace(/\s+ROUTE$/, '').trim();

/**
 * Build the day from plain table reads.
 *
 * Used when `driver_route_collections` is not deployed. It needs no new
 * database objects, so the feature works against the existing schema — the RPC
 * is preferred when present because it applies the same rules server-side and
 * returns less data over the wire.
 */
async function loadRouteDayDirect(date?: string): Promise<RouteDay> {
  const target = date ? new Date(date) : new Date();

  // `approved` only exists once the schedule migration is applied.
  let scheduleRows: any[] = [];
  const withApproved = await supabase
    .from('collection_schedules')
    .select('id, route, country, pickup_date, approved')
    .limit(300);
  if (withApproved.error) {
    const fallback = await supabase
      .from('collection_schedules')
      .select('id, route, country, pickup_date')
      .limit(300);
    if (fallback.error) throw fallback.error;
    scheduleRows = fallback.data || [];
  } else {
    scheduleRows = withApproved.data || [];
  }

  const approved = scheduleRows.filter((r) => r.approved !== false);
  const routes: ActiveRoute[] = approved
    .filter((r) => {
      const parsed = parseScheduleDate(r.pickup_date);
      return parsed != null && sameDay(parsed, target);
    })
    .map((r) => ({ scheduleId: r.id, route: r.route, country: r.country, pickupDate: r.pickup_date }));

  const scheduleIds = new Set(routes.map((r) => r.scheduleId));
  const routeKeys = new Set(routes.map((r) => routeKey(r.route)));

  // Deliberately no early return when no schedule matches today. Schedule rows
  // drift — a route can be re-run without its pickup_date being corrected — so
  // a booking that says it is being collected today is authoritative on its
  // own, and the route it names is added back to the day below.
  const { data: shipmentRows, error } = await supabase
    .from('shipments')
    .select('id, tracking_number, customer_reference, metadata, collection_status, collection_schedule_id, goods_description, assigned_driver_id, driver_status')
    .is('deleted_at', null)
    .limit(1000);
  if (error) throw error;

  const COLLECTION_COUNTRIES = ['ireland', 'republic of ireland', 'northern ireland', 'united kingdom', 'england', 'uk', 'great britain'];
  const bookedForToday = (s: any) => {
    const country = String(s.metadata?.sender?.country || s.metadata?.senderDetails?.country || s.metadata?.collection?.country || '').toLowerCase();
    if (!COLLECTION_COUNTRIES.includes(country)) return false;
    const booked = parseScheduleDate(s.metadata?.collection?.date || s.metadata?.collectionDate);
    return booked != null && sameDay(booked, target);
  };

  const collections: RouteCollection[] = (shipmentRows || [])
    .filter((s: any) =>
      (s.collection_schedule_id && scheduleIds.has(s.collection_schedule_id)) ||
      routeKeys.has(routeKey(s.metadata?.collection?.route)) ||
      bookedForToday(s))
    .map((s: any) => {
      const sender = s.metadata?.sender || s.metadata?.senderDetails || {};
      return {
        shipmentId: s.id,
        trackingNumber: s.tracking_number,
        customerReference: s.customer_reference,
        customerName: [sender.firstName, sender.lastName].filter(Boolean).join(' ').trim() || sender.name || '',
        phone: sender.phone || null,
        address: sender.address || null,
        city: sender.city || '',
        // Website bookings use `postcode`; the customer app writes `postalCode`.
        postcode: sender.postcode || sender.postalCode || '',
        route: s.metadata?.collection?.route || null,
        country: s.metadata?.sender?.country || s.metadata?.senderDetails?.country || s.metadata?.collection?.country || null,
        goodsDescription: (s.goods_description || '').slice(0, 400) || null,
        collectionStatus: s.collection_status,
        latitude: null,
        longitude: null,
        stopId: null,
        claimId: null,
        claimStatus: ['claimed', 'en_route', 'arrived', 'failed'].includes(String(s.driver_status || ''))
          ? s.driver_status
          : 'available',
        claimedBy: s.assigned_driver_id || null,
        claimedByName: null,
        claimedAt: null,
      };
    })
    .sort((a, b) => a.customerName.localeCompare(b.customerName));

  return { date: target.toISOString().slice(0, 10), routes, collections };
}

/**
 * Ireland is not on postcodes.io.
 *
 * postcodes.io only knows UK postcodes, so an Eircode ("A91RW59") is a
 * guaranteed miss, and plenty of Irish bookings carry no postcode at all —
 * "N/A" is common. Those addresses went unplaced forever, which is why the
 * Irish route map had no pins.
 *
 * Nominatim answers free-text addresses for Ireland. Its usage policy allows
 * this kind of low-volume lookup provided results are reused and requests are
 * serialised, so every hit is written back onto the shipment (see
 * set_shipment_pickup_point) and every address is looked up once, ever, for
 * every driver.
 */
const IRISH_COUNTRIES = ['ireland', 'republic of ireland', 'eire', 'éire'];
/** Northern Ireland is in the UK: postcodes.io and country code "gb" apply. */
const NORTHERN_IRELAND = ['northern ireland'];

/** Eircode: routing key (letter + 2 digits) then a 4-character unique id. */
const EIRCODE = /^[AC-FHKNPRTV-Y]\d{2}\s?[0-9AC-FHKNPRTV-Y]{4}$/i;

export function isIrishAddress(country: string | null | undefined, postcode?: string | null): boolean {
  const value = String(country || '').trim().toLowerCase();
  if (NORTHERN_IRELAND.includes(value)) return false;
  if (IRISH_COUNTRIES.includes(value)) return true;
  // A valid Eircode identifies the Republic even when the country is blank.
  return EIRCODE.test(String(postcode || '').trim());
}

/** Free-text geocode against Nominatim. Returns null on any failure. */
async function lookupNominatim(query: string, countryCodes: string) {
  if (query.trim().length < 4) return null;
  try {
    const params = new URLSearchParams({ q: query, format: 'json', limit: '1', countrycodes: countryCodes });
    const response = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
      headers: { 'Accept-Language': 'en' },
    });
    if (!response.ok) return null;
    const json = await response.json();
    const hit = Array.isArray(json) ? json[0] : null;
    const latitude = Number(hit?.lat);
    const longitude = Number(hit?.lon);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
    return { latitude, longitude };
  } catch {
    // Offline, blocked or rate limited: the list still works, just without pins.
    return null;
  }
}

// Addresses Nominatim could not place. Remembered for the session so a route
// full of unplaceable addresses does not re-query on every single refresh.
const failedAddressLookups = new Set<string>();

/**
 * Place addresses postcodes.io could not, one at a time.
 *
 * Capped per load: a driver opening the app must not wait on a long chain of
 * one-per-second lookups, and whatever is left is picked up next refresh.
 */
async function lookupAddresses(
  targets: Array<{ query: string; fallback: string; countryCodes: string; key: string }>,
  budget = 6,
): Promise<Record<string, { latitude: number; longitude: number }>> {
  const found: Record<string, { latitude: number; longitude: number }> = {};
  let spent = 0;
  for (const target of targets) {
    if (spent >= budget) break;
    const attempts = [target.query, target.fallback].filter((q, i, all) => q && all.indexOf(q) === i);
    for (const attempt of attempts) {
      const memo = `${target.countryCodes}:${attempt.toLowerCase()}`;
      if (failedAddressLookups.has(memo)) continue;
      spent += 1;
      const hit = await lookupNominatim(attempt, target.countryCodes);
      // Nominatim asks for no more than one request a second.
      await new Promise((resolve) => setTimeout(resolve, 1100));
      if (hit) { found[target.key] = hit; break; }
      failedAddressLookups.add(memo);
      if (spent >= budget) break;
    }
  }
  return found;
}

/**
 * Name the day's routes from the bookings when the schedule cannot.
 *
 * active_collection_routes() matches on collection_schedules.pickup_date, and
 * those rows drift — a route re-run without its date corrected returns no
 * routes at all even though its bookings are live. Both the RPC and the table
 * reads hit this, so the recovery belongs here rather than in either one.
 */
async function nameRoutesFromBookings(day: RouteDay): Promise<RouteDay> {
  if (day.routes?.length) return day;
  const named = (day.collections || []).filter((c) => routeKey(c.route));
  if (!named.length) return day;

  const catalogue = await supabase
    .from('collection_schedules')
    .select('id, route, country, pickup_date')
    .limit(300);

  const routes: ActiveRoute[] = [];
  const seen = new Set<string>();
  for (const collection of named) {
    const key = routeKey(collection.route);
    if (seen.has(key)) continue;
    seen.add(key);
    const match = (catalogue.data || []).find((r: any) => routeKey(r.route) === key);
    routes.push(match
      ? { scheduleId: match.id, route: match.route, country: match.country, pickupDate: match.pickup_date }
      : { scheduleId: `booking:${key}`, route: collection.route || key, country: collection.country, pickupDate: day.date });
  }
  return { ...day, routes };
}

/** Load today's route, filling in and caching any missing coordinates. */
export async function loadRouteDay(date?: string): Promise<RouteDay> {
  const { data, error } = await supabase.rpc('driver_route_collections', { p_date: date ?? null });

  // Any server-side failure falls back to table reads. It used to fall back
  // only on PGRST202 (routine not deployed), which meant a routine that was
  // deployed but raising — a bad cast, a permissions change — left the driver
  // staring at an empty day with real collections waiting on the route.
  let day: RouteDay;
  if (error) {
    console.warn('driver_route_collections unavailable, using table reads:', error.message);
    day = await loadRouteDayDirect(date);
  } else {
    day = data as RouteDay;
  }

  day = await nameRoutesFromBookings(day).catch(() => day);

  const collections = (day?.collections || []).map((c) => ({ ...c }));

  const missing = collections.filter((c) => c.latitude == null || c.longitude == null);
  if (missing.length > 0) {
    const enrichCoordinates = async () => {
      const cache = (c: RouteCollection, hit: { latitude: number; longitude: number }) => {
        c.latitude = hit.latitude;
        c.longitude = hit.longitude;
        // Cache for the next driver. Best effort — a failure costs one lookup.
        return supabase.rpc('set_shipment_pickup_point', {
          p_shipment_id: c.shipmentId,
          p_latitude: hit.latitude,
          p_longitude: hit.longitude,
        }).then(() => undefined, () => undefined) as PromiseLike<unknown>;
      };

      const writes: PromiseLike<unknown>[] = [];

      // Pass one: UK postcodes, in a single bulk request.
      const ukPostcodes = missing.filter((c) => !isIrishAddress(c.country, c.postcode));
      const resolved = await bulkLookupPostcodes(ukPostcodes.map((c) => c.postcode || ''));
      for (const c of ukPostcodes) {
        const hit = resolved[normalise(c.postcode || '')];
        if (hit) writes.push(cache(c, hit));
      }

      // Pass two: everything still unplaced — Irish addresses, and UK addresses
      // whose postcode was missing or wrong — by free-text search.
      const stillMissing = missing.filter((c) => c.latitude == null || c.longitude == null);
      if (stillMissing.length) {
        const targets = stillMissing.map((c) => {
          const irish = isIrishAddress(c.country, c.postcode);
          // "N/A" is written into this field often enough to be worth ignoring.
          const postcode = /^n\/?a$/i.test(String(c.postcode || '').trim()) ? '' : c.postcode || '';
          const country = irish ? 'Ireland' : 'United Kingdom';
          return {
            key: c.shipmentId,
            countryCodes: irish ? 'ie' : 'gb',
            query: [c.address, c.city, postcode, country].filter(Boolean).join(', '),
            // Town-level is still accurate enough to group a day's stops.
            fallback: [c.city, country].filter(Boolean).join(', '),
          };
        });
        const placed = await lookupAddresses(targets);
        for (const c of stillMissing) {
          const hit = placed[c.shipmentId];
          if (hit) writes.push(cache(c, hit));
        }
      }

      await Promise.all(writes);
    };

    // Geocoding improves the map but must never make the route appear broken.
    // Leave the slower lookups running in the background when this budget is
    // exceeded; the next refresh will use any cached points.
    await Promise.race([
      enrichCoordinates(),
      new Promise<void>((resolve) => setTimeout(resolve, 4000)),
    ]).catch(() => undefined);
  }

  return { date: day?.date, routes: day?.routes || [], collections };
}

export type CollectionClaimResult = {
  claimId: string;
  stopId: string;
  shipmentId: string;
  status: string;
};

/** Atomically reserve one shared-route collection and create its proof stop. */
export async function claimRouteCollection(shipmentId: string): Promise<CollectionClaimResult> {
  const { data, error } = await supabase.rpc('claim_route_collection', { p_shipment_id: shipmentId });
  if (error) throw error;
  return data as CollectionClaimResult;
}

export async function releaseRouteCollection(shipmentId: string, reason?: string): Promise<void> {
  const { error } = await supabase.rpc('release_route_collection', {
    p_shipment_id: shipmentId,
    p_reason: reason?.trim() || null,
  });
  if (error) throw error;
}

/**
 * Order collections by how close they are to the driver. Anything that could not
 * be placed on the map sinks to the bottom rather than disappearing — the driver
 * still has to collect it.
 */
export function sortByProximity(
  collections: RouteCollection[],
  from: { latitude: number; longitude: number } | null,
): RouteCollection[] {
  const withDistance = collections.map((c) => ({
    ...c,
    distanceKm:
      from && c.latitude != null && c.longitude != null
        ? distanceKm(from, { latitude: c.latitude, longitude: c.longitude })
        : null,
  }));

  return withDistance.sort((a, b) => {
    // Uncollected first, then nearest, then unplaceable, then by name.
    const aDone = a.collectionStatus === 'Collected' ? 1 : 0;
    const bDone = b.collectionStatus === 'Collected' ? 1 : 0;
    if (aDone !== bDone) return aDone - bDone;
    if (a.distanceKm != null && b.distanceKm != null) return a.distanceKm - b.distanceKm;
    if (a.distanceKm != null) return -1;
    if (b.distanceKm != null) return 1;
    return (a.customerName || '').localeCompare(b.customerName || '');
  });
}

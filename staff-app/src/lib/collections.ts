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
  goodsDescription: string | null;
  collectionStatus: string | null;
  latitude: number | null;
  longitude: number | null;
  stopId: string | null;
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

/** Load today's route, filling in and caching any missing coordinates. */
export async function loadRouteDay(date?: string): Promise<RouteDay> {
  const { data, error } = await supabase.rpc('driver_route_collections', { p_date: date ?? null });
  if (error) throw error;

  const day = data as RouteDay;
  const collections = (day?.collections || []).map((c) => ({ ...c }));

  const missing = collections.filter((c) => c.latitude == null || c.longitude == null);
  if (missing.length > 0) {
    const resolved = await bulkLookupPostcodes(missing.map((c) => c.postcode || ''));
    const writes: PromiseLike<unknown>[] = [];
    for (const c of missing) {
      const hit = resolved[normalise(c.postcode || '')];
      if (!hit) continue;
      c.latitude = hit.latitude;
      c.longitude = hit.longitude;
      // Cache for the next driver. Best effort — a failure costs one lookup.
      writes.push(
        supabase.rpc('set_shipment_pickup_point', {
          p_shipment_id: c.shipmentId,
          p_latitude: hit.latitude,
          p_longitude: hit.longitude,
        }).then(() => undefined, () => undefined),
      );
    }
    await Promise.all(writes);
  }

  return { date: day?.date, routes: day?.routes || [], collections };
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

import { supabase } from './supabase';
import { isMissingBackend, isNetworkError } from './offlineQueue';

/**
 * Filling in every missing map location, in batches.
 *
 * Deliberately many small calls rather than one big one. Nominatim's usage
 * policy allows one request a second, so the function sleeps between lookups —
 * ninety addresses is a minute and a half of wall clock, which is longer than
 * an edge function is willing to live. Batching keeps every call short, and
 * gives the screen something honest to show while it works.
 *
 * The loop ends because the function records a failure on any address it
 * cannot place. Without that, a row with no coordinates would be picked by
 * every pass and the run would never move past the first unresolvable address.
 */

const BATCH = 20;
/** A stop, however stuck, rather than an unbounded loop against a rate-limited service. */
const MAX_BATCHES = 60;

export type GeocodeProgress = {
  batches: number;
  considered: number;
  resolved: number;
  approximate: number;
  failed: number;
};

export type GeocodeMiss = { id: string; reference: string | null; tried: string | null };

export type BackfillResult =
  | (GeocodeProgress & { ok: true; misses: GeocodeMiss[]; hitCap: boolean })
  | { ok: false; reason: 'offline' | 'not-deployed' | 'denied' | 'error'; message: string };

export async function geocodeAllShipments(
  onProgress?: (progress: GeocodeProgress) => void,
): Promise<BackfillResult> {
  const totals: GeocodeProgress = { batches: 0, considered: 0, resolved: 0, approximate: 0, failed: 0 };
  const misses: GeocodeMiss[] = [];

  for (let batch = 0; batch < MAX_BATCHES; batch++) {
    const { data, error } = await supabase.functions.invoke('geocode-stops', {
      body: { target: 'shipments', limit: BATCH },
    });

    if (error) {
      // Anything already done stays done — the function writes each row as it
      // resolves it, so a failure part-way through is progress, not a rollback.
      if (isNetworkError(error)) {
        return { ok: false, reason: 'offline', message: 'Lost connection part-way through. Run it again to carry on.' };
      }
      if (isMissingBackend(error)) {
        return { ok: false, reason: 'not-deployed', message: 'The geocoder is not deployed yet.' };
      }
      return { ok: false, reason: 'error', message: (error as any)?.message || 'The geocoder failed.' };
    }

    const result = data as {
      considered?: number; resolved?: number; approximate?: number; failed?: number;
      misses?: GeocodeMiss[]; error?: string;
    } | null;

    if (result?.error) {
      return { ok: false, reason: 'denied', message: result.error };
    }

    const considered = Number(result?.considered || 0);
    totals.batches += 1;
    totals.considered += considered;
    totals.resolved += Number(result?.resolved || 0);
    totals.approximate += Number(result?.approximate || 0);
    totals.failed += Number(result?.failed || 0);
    for (const miss of result?.misses || []) misses.push(miss);

    onProgress?.({ ...totals });

    // Nothing left to look at.
    if (considered === 0) {
      return { ok: true, ...totals, misses, hitCap: false };
    }
  }

  return { ok: true, ...totals, misses, hitCap: true };
}

export type LocationCoverage = {
  total: number;
  located: number;
  missing: number;
  failed: number;
  approximate: number;
  verified: number;
};

/** How many shipments can actually be put on a map. */
export async function loadLocationCoverage(): Promise<LocationCoverage> {
  const count = async (build: (q: any) => any) => {
    const query = build(
      supabase.from('shipments').select('id', { count: 'exact', head: true }).is('deleted_at', null),
    );
    const { count: n } = await query;
    return Number(n || 0);
  };

  const [total, located, failed, approximate, verified] = await Promise.all([
    count((q: any) => q),
    count((q: any) => q.not('pickup_latitude', 'is', null)),
    count((q: any) => q.eq('pickup_geocode_precision', 'failed')),
    count((q: any) => q.eq('pickup_geocode_precision', 'approximate')),
    count((q: any) => q.eq('pickup_address_verified', true)),
  ]);

  return { total, located, missing: Math.max(0, total - located), failed, approximate, verified };
}

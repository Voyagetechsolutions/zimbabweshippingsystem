// Fills in coordinates so the driver map has pins.
//
// Two targets, chosen with `target` in the request body:
//   * "shipments" (default) — shipments.pickup_latitude / pickup_longitude.
//     This is the one that matters day to day: a driver plans a route straight
//     off the day's collections, so a shipment without a point is a stop that
//     cannot be mapped, ordered or navigated to.
//   * "stops" — driver_run_stops.latitude / longitude, for a run already built.
//
// The columns have existed since the phase-one driver migration but nothing ever
// wrote to them, which is why the run map almost never rendered.
//
// Coverage will never be total, and the caller is told exactly which rows
// missed so a human can finish the job: only about 40% of live bookings carry a
// postcode, and Irish addresses carry no Eircode at all ("Irish Bar Church
// Street Tullow, Cork"). Those fall to a free-text search and then to the town
// centroid, which is good enough to group a day's work but not to drive to —
// hence the admin verification step that lets someone place the pin by hand.
//
// Two free geocoders, no API key:
//   * UK collections — postcodes.io. A postcode gives an exact centroid, and the
//     sender postcode is already captured on every booking.
//   * Zimbabwe deliveries — Nominatim. Street-level data is thin there, so a
//     failed street lookup falls back to the city, which is still accurate
//     enough to group a day's drops on a map.
//
// Every lookup is cached in geocode_cache: the free services are rate limited
// and their usage policy expects results to be reused. Nominatim also requires a
// descriptive User-Agent and no more than one request per second, both of which
// are honoured below.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const USER_AGENT = 'ZimbabweShipping/1.0 (logistics dispatch; info@zimbabweshipping.co.uk)';

interface Coords { latitude: number; longitude: number; source: string }

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const normalisePostcode = (value: string) => value.toUpperCase().replace(/[^A-Z0-9]/g, '');

// Eircode: routing key (letter + 2 digits) then a 4-character unique identifier.
const EIRCODE = /^[AC-FHKNPRTV-Y]\d{2}\s?[0-9AC-FHKNPRTV-Y]{4}$/i;

/**
 * Is this collection in the Republic of Ireland?
 *
 * It matters twice over: postcodes.io does not know Eircodes, so an Irish
 * postcode is a guaranteed miss, and a Nominatim search restricted to "gb"
 * can never find a Dublin or Galway street. Northern Ireland is deliberately
 * excluded — it is in the UK and both of those paths work for it already.
 */
function isIrish(country: unknown, postcode: unknown): boolean {
  const value = String(country || '').trim().toLowerCase();
  if (value === 'northern ireland') return false;
  if (['ireland', 'republic of ireland', 'eire', 'éire'].includes(value)) return true;
  return EIRCODE.test(String(postcode || '').trim());
}

/** Cache key that ignores punctuation and case so near-identical inputs share a row. */
const cacheKey = (kind: string, query: string) =>
  `${kind}:${query.toLowerCase().replace(/\s+/g, ' ').trim()}`;

async function lookupUkPostcode(postcode: string): Promise<Coords | null> {
  const clean = normalisePostcode(postcode);
  if (clean.length < 5) return null;
  try {
    const response = await fetch(`https://api.postcodes.io/postcodes/${encodeURIComponent(clean)}`);
    if (!response.ok) return null;
    const json = await response.json();
    const result = json?.result;
    if (typeof result?.latitude !== 'number' || typeof result?.longitude !== 'number') return null;
    return { latitude: result.latitude, longitude: result.longitude, source: 'postcodes.io' };
  } catch {
    return null;
  }
}

async function lookupNominatim(query: string, countryCodes: string): Promise<Coords | null> {
  if (query.trim().length < 3) return null;
  try {
    const params = new URLSearchParams({
      q: query,
      format: 'json',
      limit: '1',
      countrycodes: countryCodes,
    });
    const response = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
      headers: { 'User-Agent': USER_AGENT, 'Accept-Language': 'en' },
    });
    if (!response.ok) return null;
    const json = await response.json();
    const hit = Array.isArray(json) ? json[0] : null;
    if (!hit) return null;
    const latitude = Number(hit.lat);
    const longitude = Number(hit.lon);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
    return { latitude, longitude, source: 'nominatim' };
  } catch {
    return null;
  }
}

type Attempt = { kind: string; query: string };

/**
 * The ordered lookups to try for one address, best first.
 *
 * A second, looser attempt always follows the precise one: a postcode that is
 * missing or wrong still leaves a street and a town worth searching, and a
 * street Nominatim has never heard of still leaves a town centroid. Callers
 * treat the last attempt as approximate — see `approximate` below.
 */
function buildAttempts(
  kind: 'collection' | 'delivery',
  address: unknown,
  sender: Record<string, any>,
  recipient: Record<string, any>,
): Attempt[] {
  const clean = (parts: unknown[]) => parts
    .filter(Boolean)
    .map(String)
    .map((part) => part.trim())
    .filter((part) => part && !/^n\/?a$/i.test(part))
    .join(', ');

  let first: string;
  let second: string;
  let firstKind: string;
  let secondKind: string;

  const senderPostcode = sender.postcode || sender.postalCode;

  if (kind === 'collection' && isIrish(sender.country, senderPostcode)) {
    // Ireland has no free postcode-to-point service, so go straight to a
    // free-text search and fall back to the town.
    firstKind = 'ie-address';
    first = clean([address || sender.address, sender.city, senderPostcode, 'Ireland']);
    secondKind = 'ie-city';
    second = clean([sender.city, 'Ireland']);
  } else if (kind === 'collection') {
    firstKind = 'uk-postcode';
    first = String(senderPostcode || '').trim();
    secondKind = 'gb-address';
    second = clean([address || sender.address, sender.city]);
  } else {
    firstKind = 'zw-address';
    first = clean([address || recipient.address, recipient.city, 'Zimbabwe']);
    secondKind = 'zw-city';
    second = clean([recipient.city, 'Zimbabwe']);
  }

  const attempts: Attempt[] = [];
  if (first && first.length >= 3) attempts.push({ kind: firstKind, query: first });
  if (second && second.length >= 3 && second !== first) attempts.push({ kind: secondKind, query: second });
  return attempts;
}

/** A town-centroid hit is fine for grouping a day's work but not for driving to. */
const APPROXIMATE_KINDS = new Set(['ie-city', 'zw-city']);

type ResolveResult = {
  coords: Coords | null;
  approximate: boolean;
  tried: string | null;
  cacheHits: number;
  networkCalls: number;
};

/** Runs the attempts in order, using and filling geocode_cache. */
async function resolveCoords(admin: any, attempts: Attempt[]): Promise<ResolveResult> {
  let cacheHits = 0;
  let networkCalls = 0;

  for (const attempt of attempts) {
    const key = cacheKey(attempt.kind, attempt.query);

    const { data: cached } = await admin
      .from('geocode_cache')
      .select('latitude, longitude, resolved, source')
      .eq('lookup_key', key)
      .maybeSingle();

    if (cached) {
      cacheHits++;
      if (cached.resolved && cached.latitude != null && cached.longitude != null) {
        return {
          coords: { latitude: cached.latitude, longitude: cached.longitude, source: cached.source },
          approximate: APPROXIMATE_KINDS.has(attempt.kind),
          tried: attempt.query,
          cacheHits,
          networkCalls,
        };
      }
      // A previous miss is remembered so we don't hammer the service again.
      continue;
    }

    let coords: Coords | null;
    if (attempt.kind === 'uk-postcode') {
      coords = await lookupUkPostcode(attempt.query);
    } else if (attempt.kind === 'gb-address') {
      coords = await lookupNominatim(attempt.query, 'gb');
      await sleep(1100); // Nominatim: max 1 request/second.
    } else if (attempt.kind === 'ie-address' || attempt.kind === 'ie-city') {
      coords = await lookupNominatim(attempt.query, 'ie');
      await sleep(1100);
    } else {
      coords = await lookupNominatim(attempt.query, 'zw');
      await sleep(1100);
    }
    networkCalls++;

    await admin.from('geocode_cache').upsert({
      lookup_key: key,
      query: attempt.query,
      latitude: coords?.latitude ?? null,
      longitude: coords?.longitude ?? null,
      source: coords?.source ?? attempt.kind,
      resolved: Boolean(coords),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'lookup_key' });

    if (coords) {
      return {
        coords,
        approximate: APPROXIMATE_KINDS.has(attempt.kind),
        tried: attempt.query,
        cacheHits,
        networkCalls,
      };
    }
  }

  return {
    coords: null,
    approximate: false,
    tried: attempts.length ? attempts[0].query : null,
    cacheHits,
    networkCalls,
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  try {
    // The caller must be a signed-in member of staff. Geocoding reads customer
    // addresses, so it is not open to anonymous callers.
    const authHeader = req.headers.get('Authorization') || '';
    const caller = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: { user } } = await caller.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: 'Authentication required' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: profile } = await admin
      .from('profiles')
      .select('is_admin, role')
      .eq('id', user.id)
      .maybeSingle();
    const role = String(profile?.role || '').toLowerCase();
    const isStaff = Boolean(profile?.is_admin) || ['admin', 'logistics', 'dispatcher', 'driver'].includes(role);
    if (!isStaff) {
      return new Response(JSON.stringify({ error: 'Staff access required' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json().catch(() => ({}));
    const runId: string | null = body?.runId ?? null;
    // New callers say which target they mean. Older ones cannot: builds already
    // on drivers' phones ask for `{ runId }` and nothing else, and they mean
    // stops. Treating a bare runId as "stops" keeps every installed app doing
    // exactly what it did before, while anything newer defaults to shipments —
    // which is the target that matters now that runs are built on the phone.
    const target: 'shipments' | 'stops' = body?.target === 'stops' ? 'stops'
      : body?.target === 'shipments' ? 'shipments'
      : runId ? 'stops'
      : 'shipments';
    const shipmentIds: string[] | null = Array.isArray(body?.shipmentIds) && body.shipmentIds.length
      ? body.shipmentIds.map(String)
      : null;
    // `force` re-geocodes rows that already have a point, for when an address
    // has been corrected. Without it only the gaps are filled.
    const force = Boolean(body?.force);
    const limit = Math.min(Number(body?.limit) || 60, 200);

    let resolved = 0;
    let failed = 0;
    let approximateCount = 0;
    let cacheHits = 0;
    let networkCalls = 0;
    // Named so a human can act on the misses rather than guess at them.
    const misses: Array<{ id: string; reference: string | null; tried: string | null }> = [];
    const approximate: Array<{ id: string; reference: string | null; tried: string | null }> = [];
    let considered = 0;

    if (target === 'stops') {
      let query = admin
        .from('driver_run_stops')
        .select('id, run_id, stop_type, address, latitude, longitude, shipment:shipments(metadata)')
        .limit(limit);
      if (!force) query = query.is('latitude', null);
      if (runId) query = query.eq('run_id', runId);

      const { data: stops, error: stopsError } = await query;
      if (stopsError) throw stopsError;
      considered = (stops || []).length;

      for (const stop of (stops || []) as any[]) {
        const metadata = stop.shipment?.metadata || {};
        const sender = metadata.sender || metadata.senderDetails || {};
        const recipient = metadata.recipient || metadata.recipientDetails || {};

        const result = await resolveCoords(
          admin,
          buildAttempts(stop.stop_type === 'collection' ? 'collection' : 'delivery', stop.address, sender, recipient),
        );
        cacheHits += result.cacheHits;
        networkCalls += result.networkCalls;

        if (!result.coords) {
          failed++;
          misses.push({ id: stop.id, reference: null, tried: result.tried });
          continue;
        }

        const { error: updateError } = await admin
          .from('driver_run_stops')
          .update({
            latitude: result.coords.latitude,
            longitude: result.coords.longitude,
            updated_at: new Date().toISOString(),
          })
          .eq('id', stop.id);
        if (updateError) {
          failed++;
          misses.push({ id: stop.id, reference: null, tried: result.tried });
        } else {
          resolved++;
          if (result.approximate) {
            approximateCount++;
            approximate.push({ id: stop.id, reference: null, tried: result.tried });
          }
        }
      }
    } else {
      // The precision column arrives with the address-verification migration,
      // which is applied by hand here and so may lag a deploy of this function.
      // Probe for it once rather than failing every row: without it the
      // geocoder still fills coordinates, it just cannot record how good they
      // are or protect a hand-placed pin.
      const probe = await admin.from('shipments').select('pickup_geocode_precision').limit(1);
      const hasPrecision = !probe.error;

      // Collections only: a shipment's pickup point is what the driver routes
      // to. Cancelled and already-delivered work is not worth a lookup.
      const columns = ['id', 'customer_reference', 'tracking_number', 'origin', 'metadata', 'pickup_latitude']
        .concat(hasPrecision ? ['pickup_geocode_precision'] : []);
      let query = admin
        .from('shipments')
        .select(columns.join(', '))
        .is('deleted_at', null)
        .not('status', 'in', '("Delivered","Cancelled","cancelled")')
        .limit(limit);
      if (!force) {
        query = query.is('pickup_latitude', null);
        // Skip the ones already proved unresolvable. Without this a bulk run
        // never finishes: a row with no coordinates is picked by every pass,
        // so an address no geocoder can place is retried for ever and the
        // rows behind it are never reached.
        if (hasPrecision) query = query.or('pickup_geocode_precision.is.null,pickup_geocode_precision.neq.failed');
      }
      // A pin a human placed outranks anything a geocoder can find, so even a
      // forced pass leaves it alone.
      if (force && hasPrecision) {
        query = query.or('pickup_geocode_precision.is.null,pickup_geocode_precision.neq.manual');
      }
      if (shipmentIds) query = query.in('id', shipmentIds);

      const { data: rows, error: rowsError } = await query;
      if (rowsError) throw rowsError;
      considered = (rows || []).length;

      for (const row of (rows || []) as any[]) {
        const metadata = row.metadata || {};
        const sender = metadata.sender || metadata.senderDetails || metadata.sender_details || {};
        const reference = row.customer_reference || row.tracking_number || null;

        // `origin` carries the country when the sender block does not — live
        // rows hold values like "Ireland " with a trailing space.
        const senderWithCountry = { ...sender, country: sender.country || row.origin };

        const result = await resolveCoords(
          admin,
          buildAttempts('collection', sender.address, senderWithCountry, {}),
        );
        cacheHits += result.cacheHits;
        networkCalls += result.networkCalls;

        if (!result.coords) {
          failed++;
          misses.push({ id: row.id, reference, tried: result.tried });
          // Remember the miss so the next pass moves past it. Admin sees these
          // as "needs a pin" rather than the run silently stalling on them.
          if (hasPrecision) {
            await admin.from('shipments')
              .update({ pickup_geocode_precision: 'failed' })
              .eq('id', row.id);
          }
          continue;
        }

        // updated_at is deliberately left alone: this is a system backfill, and
        // bumping it would make every shipment look freshly edited in the
        // admin lists that sort by it.
        const patch: Record<string, unknown> = {
          pickup_latitude: result.coords.latitude,
          pickup_longitude: result.coords.longitude,
        };
        if (hasPrecision) patch.pickup_geocode_precision = result.approximate ? 'approximate' : 'exact';

        const { error: updateError } = await admin
          .from('shipments')
          .update(patch)
          .eq('id', row.id);
        if (updateError) {
          failed++;
          misses.push({ id: row.id, reference, tried: result.tried });
        } else {
          resolved++;
          if (result.approximate) {
            approximateCount++;
            approximate.push({ id: row.id, reference, tried: result.tried });
          }
        }
      }
    }

    return new Response(JSON.stringify({
      ok: true,
      target,
      considered,
      resolved,
      failed,
      approximate: approximateCount,
      cacheHits,
      networkCalls,
      // Capped so a large backfill cannot return a huge payload.
      misses: misses.slice(0, 50),
      approximateRows: approximate.slice(0, 50),
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (err) {
    console.error('geocode-stops error:', err);
    return new Response(JSON.stringify({ error: String((err as Error)?.message || err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// Fills in driver_run_stops.latitude / longitude so the driver map has pins.
//
// The columns have existed since the phase-one driver migration but nothing ever
// wrote to them, which is why the run map almost never rendered.
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
    const limit = Math.min(Number(body?.limit) || 60, 200);

    // Only stops that still have no coordinates.
    let query = admin
      .from('driver_run_stops')
      .select('id, run_id, stop_type, address, latitude, longitude, shipment:shipments(metadata)')
      .is('latitude', null)
      .limit(limit);
    if (runId) query = query.eq('run_id', runId);

    const { data: stops, error: stopsError } = await query;
    if (stopsError) throw stopsError;

    let resolved = 0;
    let failed = 0;
    let cacheHits = 0;
    let networkCalls = 0;

    for (const stop of (stops || []) as any[]) {
      const metadata = stop.shipment?.metadata || {};
      const sender = metadata.sender || metadata.senderDetails || {};
      const recipient = metadata.recipient || metadata.recipientDetails || {};

      // Build the best query available for this kind of stop.
      let kind: string;
      let query1: string;
      let fallback: string | null = null;
      if (stop.stop_type === 'collection') {
        kind = 'uk-postcode';
        query1 = String(sender.postcode || sender.postalCode || '').trim();
        // Without a postcode, try the street address in GB.
        fallback = [stop.address || sender.address, sender.city].filter(Boolean).join(', ');
      } else {
        kind = 'zw-address';
        query1 = [stop.address || recipient.address, recipient.city, 'Zimbabwe'].filter(Boolean).join(', ');
        fallback = [recipient.city, 'Zimbabwe'].filter(Boolean).join(', ');
      }

      const attempts: Array<{ kind: string; query: string }> = [];
      if (query1 && query1.length >= 3) attempts.push({ kind, query: query1 });
      if (fallback && fallback.length >= 3 && fallback !== query1) {
        attempts.push({ kind: kind === 'uk-postcode' ? 'gb-address' : 'zw-city', query: fallback });
      }

      let coords: Coords | null = null;

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
            coords = { latitude: cached.latitude, longitude: cached.longitude, source: cached.source };
            break;
          }
          // A previous miss is remembered so we don't hammer the service again.
          continue;
        }

        if (attempt.kind === 'uk-postcode') {
          coords = await lookupUkPostcode(attempt.query);
        } else if (attempt.kind === 'gb-address') {
          coords = await lookupNominatim(attempt.query, 'gb');
          await sleep(1100); // Nominatim: max 1 request/second.
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

        if (coords) break;
      }

      if (coords) {
        const { error: updateError } = await admin
          .from('driver_run_stops')
          .update({ latitude: coords.latitude, longitude: coords.longitude, updated_at: new Date().toISOString() })
          .eq('id', stop.id);
        if (updateError) failed++;
        else resolved++;
      } else {
        failed++;
      }
    }

    return new Response(JSON.stringify({
      ok: true,
      considered: (stops || []).length,
      resolved,
      failed,
      cacheHits,
      networkCalls,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (err) {
    console.error('geocode-stops error:', err);
    return new Response(JSON.stringify({ error: String((err as Error)?.message || err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

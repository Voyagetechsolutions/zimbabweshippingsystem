import { supabase } from './supabase';
import { parseCollectionDate } from './format';

/**
 * Resolving a shipment's collection route and date.
 *
 * Every shipment has one — the schedule decides it — but almost none of them
 * carry it on the booking. `metadata.collection` was written by older code with
 * the literal defaults "To be assigned" and "To be confirmed", so a screen that
 * printed `collection.route || 'Not assigned'` printed the placeholder, and
 * staff on a confirmation call had nothing to read out. The published schedule
 * has the answer the whole time; this joins the two.
 *
 * Four ways in, best first:
 *   1. the booking's own date, when it is a real one
 *   2. the schedule row the booking was matched to (collection_schedule_id)
 *   3. the route the booking names, matched to the schedule by name
 *   4. the sender's postcode or town, matched against the schedule's areas
 *
 * Only a shipment whose sender we cannot place at all comes back unresolved,
 * and it says so rather than inventing a date.
 */

export type ScheduleRow = {
  id: string;
  route: string;
  pickup_date: string;
  country?: string | null;
  areas?: unknown;
};

export type ResolvedCollection = {
  route: string | null;
  date: Date | null;
  /** How the answer was reached — shown to staff so a guess never reads as fact. */
  source: 'booking' | 'schedule' | 'route' | 'area' | null;
};

const PLACEHOLDERS = new Set([
  'to be confirmed', 'to be assigned', 'not assigned', 'not set', 'tbc', 'n/a', 'none', 'unknown', '-', '—',
]);

/** The old placeholder strings are absence, not data. */
export function realValue(value: unknown): string | null {
  const text = String(value ?? '').trim();
  if (!text || PLACEHOLDERS.has(text.toLowerCase())) return null;
  return text;
}

/** Route names are stored with and without the " ROUTE" suffix. */
const routeKey = (name: unknown) => String(name || '').toUpperCase().replace(/\s+ROUTE$/, '').trim();

const normalise = (value: unknown) => String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
const outwardCode = (value: unknown) => {
  const clean = normalise(value);
  return clean.length > 4 ? clean.slice(0, -3) : clean;
};

/**
 * Whether a schedule's areas cover this sender. Ported from the customer app so
 * both sides place a booking on the same route.
 *
 * UK schedule areas are town names (LUTON, BEDFORD, CENTRAL LONDON…), so an
 * outward-code comparison alone never matches — the town is compared as well.
 */
export function scheduleCoversSender(
  areas: unknown, postcode?: string | null, city?: string | null, country?: string | null,
  route?: string | null,
): boolean {
  // The route name counts as one of its own areas. "NOTTINGHAM ROUTE" lists
  // Leicester, Derby, Peterborough and Corby but not Nottingham, because the
  // town it is named after is taken as read — so a Nottingham sender matched
  // nothing until the name itself was compared.
  const values = [...(Array.isArray(areas) ? areas : [areas]), routeKey(route)];
  if (String(country || '').toLowerCase().includes('ireland')) {
    const wanted = normalise(city);
    if (!wanted) return false;
    return values.some((value) => {
      const area = normalise(value);
      return Boolean(area) && (area.includes(wanted) || wanted.includes(area));
    });
  }
  const code = outwardCode(postcode);
  const town = normalise(city);
  // Unlike the customer's own schedule browser, an empty location matches
  // nothing here — guessing a route for a booking with no address is worse
  // than admitting we cannot place it.
  if (!code && town.length < 3) return false;
  return values.some((value) => {
    const area = normalise(value);
    if (!area) return false;
    if (code && (area.includes(code) || code.includes(area))) return true;
    return town.length >= 3 && (area.includes(town) || town.includes(area));
  });
};

function upcomingFirst(rows: Array<ScheduleRow & { parsed: Date | null }>) {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const upcoming = rows
    .filter((row): row is ScheduleRow & { parsed: Date } =>
      Boolean(row.parsed && row.parsed.getTime() >= startOfToday.getTime()))
    .sort((a, b) => a.parsed.getTime() - b.parsed.getTime());
  return upcoming[0] || null;
}

type ShipmentLike = {
  metadata?: any;
  collection_schedule_id?: string | null;
};

export function resolveCollection(shipment: ShipmentLike, schedules: ScheduleRow[]): ResolvedCollection {
  const meta = shipment?.metadata || {};
  const booked = meta.collection || {};
  const sender = meta.sender || meta.senderDetails || {};
  const rows = schedules.map((row) => ({ ...row, parsed: parseCollectionDate(row.pickup_date) }));

  const bookedRoute = realValue(booked.route) || realValue(meta.collectionRoute);
  const bookedDate = parseCollectionDate(realValue(booked.date) ?? realValue(meta.collectionDate));

  // 1. The booking already knows.
  if (bookedDate) return { route: bookedRoute, date: bookedDate, source: 'booking' };

  // 2. The schedule row it was matched to at booking time.
  const byId = shipment.collection_schedule_id
    ? rows.find((row) => row.id === shipment.collection_schedule_id)
    : undefined;
  if (byId?.parsed) return { route: byId.route, date: byId.parsed, source: 'schedule' };

  // 3. The route the booking names, even though its date went missing.
  if (bookedRoute) {
    const named = rows.filter((row) => routeKey(row.route) === routeKey(bookedRoute));
    const next = upcomingFirst(named);
    if (next) return { route: next.route, date: next.parsed, source: 'route' };
    if (named.length) return { route: named[0].route, date: named[0].parsed, source: 'route' };
  }

  // 4. Where the sender actually is.
  const covering = rows.filter((row) => scheduleCoversSender(
    row.areas,
    sender.postcode || sender.postalCode,
    sender.city,
    sender.country || booked.country,
    row.route,
  ));
  const next = upcomingFirst(covering);
  if (next) return { route: next.route, date: next.parsed, source: 'area' };

  return { route: bookedRoute, date: null, source: bookedRoute ? 'booking' : null };
}

export async function loadSchedules(): Promise<ScheduleRow[]> {
  const { data, error } = await supabase
    .from('collection_schedules')
    .select('id, route, pickup_date, country, areas')
    .limit(300);
  if (error) return [];
  return (data as ScheduleRow[]) || [];
}

export function collectionDateLabel(date: Date | null): string {
  return date
    ? date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })
    : 'Not published yet';
}

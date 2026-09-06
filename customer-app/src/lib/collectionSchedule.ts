import { supabase } from './supabase';
import { parseCollectionDate } from './format';
import { scheduleMatchesPostcode } from './postcode';

/**
 * The next collection date, resolved exactly the way the website resolves it.
 *
 * The site's hero reads every published row of `collection_schedules`, keeps
 * the ones whose pickup date has not passed, and shows the soonest — so a
 * visitor always sees a real date. The app used to filter that same table down
 * to the customer's own postcode first and, when nothing matched (an area with
 * no published route, a postcode we could not place, a route whose date had
 * gone), had nothing left to show and fell back to "to be confirmed".
 *
 * Both questions are worth answering, so both are: the customer's own area
 * wins when it has an upcoming date, and otherwise the soonest published date
 * anywhere is shown — the same one the website is advertising. There is no
 * third case where we say nothing.
 */

export type ScheduleRow = {
  id?: string;
  route: string;
  pickup_date: string;
  country?: string | null;
  areas?: unknown;
};

export type Area = {
  postcode?: string | null;
  city?: string | null;
  country?: string | null;
};

export type NextCollection = {
  route: string;
  date: Date;
  /** "Ireland" or "United Kingdom", the same labels the website uses. */
  country: string;
  /** False when this is the national next date rather than the customer's own route. */
  isMyArea: boolean;
};

export function countryLabel(country?: string | null): string {
  return String(country || '').toLowerCase().includes('ireland') ? 'Ireland' : 'United Kingdom';
}

/** Published routes whose date has not passed, soonest first. */
export function upcomingSchedules<T extends ScheduleRow>(rows: T[]): Array<T & { parsed: Date }> {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  return rows
    .map((row) => ({ ...row, parsed: parseCollectionDate(row.pickup_date) }))
    .filter((row): row is T & { parsed: Date } =>
      Boolean(row.parsed && row.parsed.getTime() >= startOfToday.getTime()))
    .sort((a, b) => a.parsed.getTime() - b.parsed.getTime());
}

/** The customer's own next date if their area has one, otherwise the site's. */
export function pickNextCollection(rows: ScheduleRow[], area: Area): NextCollection | null {
  const upcoming = upcomingSchedules(rows);
  if (!upcoming.length) return null;
  const mine = area.postcode || area.city
    ? upcoming.find((row) => scheduleMatchesPostcode(row.areas, area.postcode, area.city, area.country))
    : undefined;
  const chosen = mine || upcoming[0];
  return {
    route: chosen.route,
    date: chosen.parsed,
    country: countryLabel(chosen.country),
    isMyArea: Boolean(mine),
  };
}

export async function loadSchedules(): Promise<ScheduleRow[]> {
  const { data } = await supabase
    .from('collection_schedules')
    .select('id, route, pickup_date, country, areas')
    .limit(300);
  return (data as ScheduleRow[]) || [];
}

export async function loadNextCollection(area: Area): Promise<NextCollection | null> {
  return pickNextCollection(await loadSchedules(), area);
}

/**
 * Treat the old placeholder strings as the absence they actually are.
 *
 * `metadata.collection.route` and `.date` were written with literal defaults —
 * "To be assigned", "To be confirmed", "Not set" — by earlier versions of the
 * booking and edit routines. They are still sitting in live rows, and because
 * they are non-empty strings every `value || fallback` in the app happily
 * showed the placeholder instead of the real published date behind it. Reading
 * them back through here is what stops the words reappearing on screens that
 * have otherwise been cleaned up.
 */
const PLACEHOLDERS = new Set([
  'to be confirmed', 'to be assigned', 'not set', 'tbc', 'n/a', 'none', 'unknown', '-', '—',
]);

export function realValue(value: unknown): string | null {
  const text = String(value ?? '').trim();
  if (!text || PLACEHOLDERS.has(text.toLowerCase())) return null;
  return text;
}

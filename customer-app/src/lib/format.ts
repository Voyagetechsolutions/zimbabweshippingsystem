export function money(amount: number, symbol = '£'): string {
  return `${symbol}${(amount || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export function longDate(value: Date): string {
  return value.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

export function shortDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return '—';
  }
}

// Collection dates are stored in mixed formats ("2026-08-04", "04/08/2026",
// "August 4th, 2026") — same parser the web admin and Zimmy use.
export function parseCollectionDate(value: unknown): Date | null {
  const raw = String(value || '').trim();
  if (!raw) return null;
  // Earlier booking code wrote literal placeholders into this field. They are
  // not dates, and letting them through only produced an Invalid Date further
  // down where the reason was no longer obvious.
  if (/^(to be (confirmed|assigned)|not set|tbc|n\/?a)$/i.test(raw)) return null;
  const isoDate = raw.match(/^\d{4}-\d{2}-\d{2}/)?.[0];
  const ukDate = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  const normalised = raw.replace(/(\d{1,2})(?:st|nd|rd|th)\b/gi, '$1');
  const parsed = isoDate
    ? new Date(`${isoDate}T12:00:00Z`)
    : ukDate
      ? new Date(`${ukDate[3]}-${ukDate[2].padStart(2, '0')}-${ukDate[1].padStart(2, '0')}T12:00:00Z`)
      : new Date(normalised);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * The calendar day a Date falls on, as "YYYY-MM-DD".
 *
 * `toISOString().slice(0, 10)` is the obvious way to do this and it is wrong
 * for these dates. `parseCollectionDate` builds its ordinal form — "September
 * 19th, 2026", the shape every published schedule uses — through the bare
 * `Date` constructor, which lands on *local* midnight. In Ireland on summer
 * time that is 23:00 UTC the day before, so the ISO string names the 18th and
 * a customer confirming their collection slot is shown, and stored against,
 * the wrong day.
 */
export function isoDay(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

/**
 * "September 19th, 2026" — the canonical spelling of a collection date.
 *
 * The JS mirror of the database's `schedule_date_text`. Every published
 * schedule and every `metadata.collection.date` ever written is in this form,
 * and the server reads it straight back with `parse_schedule_date` to decide
 * which consignment a booking belongs to — so a date the app sends has to be
 * spelled exactly this way, not merely be a readable date.
 */
export function ordinalDate(date: Date): string {
  const day = date.getDate();
  const suffix = day % 100 >= 11 && day % 100 <= 13 ? 'th'
    : day % 10 === 1 ? 'st'
    : day % 10 === 2 ? 'nd'
    : day % 10 === 3 ? 'rd'
    : 'th';
  return `${MONTHS[date.getMonth()]} ${day}${suffix}, ${date.getFullYear()}`;
}

export function daysUntil(date: Date): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

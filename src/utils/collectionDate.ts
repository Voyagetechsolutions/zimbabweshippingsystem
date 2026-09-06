/**
 * Parsing `collection_schedules.pickup_date`.
 *
 * That column is free text and holds three shapes in practice: the ordinal
 * form the admin schedule editor writes ("September 14th, 2026"), ISO
 * ("2026-09-14") and UK short form ("14/09/2026"). Every live row today is the
 * ordinal form, and `new Date("September 14th, 2026")` is an Invalid Date — so
 * any caller reaching for the bare constructor silently drops the entire
 * schedule. The homepage hero did exactly that, which is why its "next
 * collection" chip never appeared.
 *
 * Ported verbatim from the customer app's `parseCollectionDate`, so the site,
 * the customer app and the staff app all read the same date out of the same
 * row. Noon UTC is deliberate: it keeps a date-only value on the intended day
 * either side of a timezone boundary.
 */
export function parseCollectionDate(value: unknown): Date | null {
  const raw = String(value || '').trim();
  if (!raw) return null;
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

export type ScheduleLike = { route: string; pickup_date: string; country?: string | null };

/**
 * The soonest published collection whose date has not passed, or null.
 *
 * This is the answer the customer app's home screen shows, so the site and the
 * app cannot disagree about when the van next runs.
 */
export function nextPublishedCollection<T extends ScheduleLike>(rows: T[]): (T & { date: Date }) | null {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  return rows
    .map((row) => ({ ...row, date: parseCollectionDate(row.pickup_date) }))
    .filter((row): row is T & { date: Date } =>
      Boolean(row.date && row.date.getTime() >= startOfToday.getTime()))
    .sort((a, b) => a.date.getTime() - b.date.getTime())[0] || null;
}

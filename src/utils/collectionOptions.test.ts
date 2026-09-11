import { describe, it, expect, vi } from 'vitest';

// Same shape as addressLookup.test.ts: the real client opens an auth session on
// import, which this file has no use for and which leaks an unhandled rejection
// into the run.
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { rpc: async () => ({ data: null, error: null }) },
}));

import { reconcileChoice, EMPTY_OFFER, type CollectionOption } from './collectionOptions';
import { parseCollectionDate } from './collectionDate';

const option = (id: string, date: string, label: string): CollectionOption =>
  ({ id, date, label, periodId: `p-${id}`, period: `${label} consignment` });

const september = option('sep', '2026-09-19', 'September 19th, 2026');
const october = option('oct', '2026-10-17', 'October 17th, 2026');

describe('reconcileChoice', () => {
  it('keeps the date the customer picked', () => {
    expect(reconcileChoice([september, october], 'oct')).toBe(october);
  });

  it('defaults to the soonest when nothing is picked yet', () => {
    expect(reconcileChoice([september, october], null)).toBe(september);
  });

  // Changing the postcode changes the route. Carrying the old route's date
  // across would book a van that never comes to the new address.
  it('drops a choice the new route does not offer', () => {
    expect(reconcileChoice([october], 'sep')).toBe(october);
  });

  it('has no answer when the route has no published date', () => {
    expect(reconcileChoice([], 'sep')).toBeNull();
    expect(reconcileChoice(EMPTY_OFFER.options, null)).toBeNull();
  });
});

/** The calendar day, read the way every screen reads it: locally. */
const localDay = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

describe('the label the server sends', () => {
  // The label is what goes into metadata.collection.date, and the server reads
  // it straight back with parse_schedule_date to decide which consignment the
  // shipment belongs to. If the two spellings ever disagree the booking lands
  // in the month it was taken rather than the month it ships.
  //
  // Compared as a local calendar day, not via toISOString: the ordinal branch
  // of parseCollectionDate builds a local midnight, so in any timezone ahead
  // of UTC its ISO string names the previous day.
  it('parses back to the same day', () => {
    for (const [label, iso] of [
      ['September 1st, 2026', '2026-09-01'],
      ['September 2nd, 2026', '2026-09-02'],
      ['September 3rd, 2026', '2026-09-03'],
      ['September 11th, 2026', '2026-09-11'],
      ['September 12th, 2026', '2026-09-12'],
      ['September 13th, 2026', '2026-09-13'],
      ['September 19th, 2026', '2026-09-19'],
      ['September 21st, 2026', '2026-09-21'],
      ['September 22nd, 2026', '2026-09-22'],
      ['September 23rd, 2026', '2026-09-23'],
      ['October 31st, 2026', '2026-10-31'],
      ['November 1st, 2026', '2026-11-01'],
    ] as const) {
      const parsed = parseCollectionDate(label);
      expect(parsed, label).not.toBeNull();
      expect(localDay(parsed!), label).toBe(iso);
    }
  });
});

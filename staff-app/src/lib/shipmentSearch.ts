import { supabase } from './supabase';
import {
  customerRef, receiverName, receiverPhone, senderName, senderPhone,
  type Shipment,
} from './shipment';

/**
 * Finding a shipment by what is printed on it.
 *
 * The trap this exists to avoid: only one shipment in sixty carries a stored
 * `customer_reference`. Every other one shows a reference the app *computes*
 * from the sender's name, the booking month and the last four digits of their
 * phone — MAR09260013. Searching the stored column alone therefore matches
 * nothing for almost every shipment in the business, while the reference the
 * driver is reading off the screen sits right there.
 *
 * So the same helper that renders a reference is the one that matches it.
 */

/**
 * The little a shipment needs to be searchable.
 *
 * Deliberately looser than `Shipment`: several screens carry their own trimmed
 * row type with only the columns they select, and all of them should be able
 * to use one matcher rather than growing a second, subtly different one.
 */
export type SearchableShipment = {
  tracking_number?: string | null;
  customer_reference?: string | null;
  created_at?: string | null;
  metadata?: any;
};

/** Everything a shipment can be found by, as one lowercase haystack. */
function haystack(input: SearchableShipment): string {
  const shipment = input as Shipment;
  const meta: any = shipment.metadata || {};
  const sender = meta.sender || meta.senderDetails || {};
  const recipient = meta.recipient || meta.recipientDetails || {};
  return [
    shipment.tracking_number,
    shipment.customer_reference,
    // The computed reference, which is what most shipments actually display.
    customerRef(shipment),
    meta.customerReference,
    senderName(shipment), senderPhone(shipment),
    sender.email, sender.city, sender.postcode || sender.postalCode, sender.address,
    receiverName(shipment), receiverPhone(shipment),
    recipient.city, recipient.address,
  ]
    .map((value) => String(value ?? '').toLowerCase())
    .join(' | ');
}

/**
 * Does this shipment match what was typed?
 *
 * Every word has to appear somewhere, so "mark 6988" narrows rather than
 * widens. Punctuation is ignored on both sides: a reference read aloud and
 * typed back as "MAR-0926-0013" should still find MAR09260013.
 */
export function matchesShipmentQuery(shipment: SearchableShipment, query: string): boolean {
  const needle = String(query ?? '').trim().toLowerCase();
  if (!needle) return false;

  const hay = haystack(shipment);
  const loose = hay.replace(/[^a-z0-9| ]/g, '');

  return needle
    .split(/\s+/)
    .filter(Boolean)
    .every((word) => {
      if (hay.includes(word)) return true;
      const bare = word.replace(/[^a-z0-9]/g, '');
      return Boolean(bare) && loose.includes(bare);
    });
}

const SEARCH_COLUMNS =
  'id, tracking_number, customer_reference, status, driver_status, origin, destination, ' +
  'created_at, collection_schedule_id, collection_period_id, goods_description, metadata, ' +
  'pickup_latitude, pickup_longitude';

/**
 * Search every shipment, not just the ones on today's route.
 *
 * A driver standing at a door with a parcel that was booked for next week
 * still has to be able to pull it up, so this deliberately ignores dates,
 * routes and assignment.
 *
 * Two passes, because a computed reference cannot be expressed as a database
 * filter: the server narrows on the columns it can, and a recent window is
 * scanned locally for everything derived. At the size this business runs at
 * the local pass is the one that does the work; the cap keeps it honest if it
 * grows.
 */
export const SEARCH_SCAN_LIMIT = 500;

export type ShipmentSearchResult = {
  shipments: Shipment[];
  /** True when the local scan hit its cap, so older matches may exist. */
  truncated: boolean;
};

export async function searchShipments(query: string, limit = 25): Promise<ShipmentSearchResult> {
  const term = String(query ?? '').trim();
  if (term.length < 2) return { shipments: [], truncated: false };

  const escaped = term.replace(/[%,()]/g, ' ').trim();
  const byId = supabase
    .from('shipments')
    .select(SEARCH_COLUMNS)
    .is('deleted_at', null)
    .or(`tracking_number.ilike.%${escaped}%,customer_reference.ilike.%${escaped}%`)
    .limit(limit);

  const recent = supabase
    .from('shipments')
    .select(SEARCH_COLUMNS)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(SEARCH_SCAN_LIMIT);

  const [exact, scan] = await Promise.all([byId, recent]);
  if (exact.error && scan.error) throw exact.error;

  const merged = new Map<string, Shipment>();
  for (const row of ((exact.data || []) as unknown as Shipment[])) merged.set(row.id, row);
  for (const row of ((scan.data || []) as unknown as Shipment[])) {
    if (merged.has(row.id)) continue;
    if (matchesShipmentQuery(row, term)) merged.set(row.id, row);
  }

  return {
    shipments: Array.from(merged.values()).slice(0, limit),
    truncated: (scan.data || []).length >= SEARCH_SCAN_LIMIT,
  };
}

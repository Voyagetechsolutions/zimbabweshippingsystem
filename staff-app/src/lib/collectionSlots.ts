import { supabase } from './supabase';

/**
 * Collection time slots, dispatch's side of them.
 *
 * Customers are asked two days out to pick a two-hour window between 07:00 and
 * 23:00. Dispatch sequences the day around those answers; when a customer has
 * to be moved, the app tells them — but an in-app notice is not a conversation,
 * so the move stays flagged here until somebody records a WhatsApp or a call.
 */

export type CollectionSlot = {
  shipment_id: string;
  user_id: string | null;
  collection_date: string | null;
  route: string | null;
  requested_start: string | null;
  requested_end: string | null;
  requested_flexible: boolean;
  requested_at: string | null;
  dispatch_start: string | null;
  dispatch_end: string | null;
  dispatch_set_at: string | null;
  change_reason: string | null;
  customer_informed_at: string | null;
  customer_informed_via: string | null;
  reminder_sent_at: string | null;
};

export const SLOT_WINDOWS: Array<{ start: string; end: string }> = [
  { start: '07:00', end: '09:00' },
  { start: '09:00', end: '11:00' },
  { start: '11:00', end: '13:00' },
  { start: '13:00', end: '15:00' },
  { start: '15:00', end: '17:00' },
  { start: '17:00', end: '19:00' },
  { start: '19:00', end: '21:00' },
  { start: '21:00', end: '23:00' },
];

/** Postgres returns "09:00:00"; everything on screen wants "09:00". */
export function hhmm(value?: string | null): string {
  return String(value || '').slice(0, 5);
}

export function windowLabel(start?: string | null, end?: string | null): string {
  const from = hhmm(start);
  const to = hhmm(end);
  return from && to ? `${from}–${to}` : '';
}

export type SlotState =
  | 'awaiting_customer'
  | 'customer_confirmed'
  | 'scheduled'
  | 'customer_moved'
  | 'dispatch_moved_untold'
  | 'dispatch_moved_told';

/**
 * Derived from the timestamps rather than stored, so it cannot drift. Being
 * told only counts if it happened after the change it is meant to cover —
 * ringing someone on Tuesday does not discharge a move made on Wednesday.
 */
export function slotState(slot?: CollectionSlot | null): SlotState {
  if (!slot?.requested_at) return 'awaiting_customer';
  if (!slot.dispatch_set_at) return 'customer_confirmed';
  if (new Date(slot.requested_at) > new Date(slot.dispatch_set_at)) return 'customer_moved';

  const moved = !slot.requested_flexible
    && (hhmm(slot.dispatch_start) !== hhmm(slot.requested_start)
      || hhmm(slot.dispatch_end) !== hhmm(slot.requested_end));
  if (!moved) return 'scheduled';

  const told = slot.customer_informed_at
    && new Date(slot.customer_informed_at) >= new Date(slot.dispatch_set_at);
  return told ? 'dispatch_moved_told' : 'dispatch_moved_untold';
}

/** What the customer asked for, as a phrase dispatch can read at a glance. */
export function requestedLabel(slot?: CollectionSlot | null): string {
  if (!slot?.requested_at) return 'No time chosen yet';
  if (slot.requested_flexible) return 'Any time — flexible';
  return windowLabel(slot.requested_start, slot.requested_end);
}

/** True when dispatch owes this customer a WhatsApp or a call. */
export function owesContact(slot?: CollectionSlot | null): boolean {
  return slotState(slot) === 'dispatch_moved_untold';
}

const COLUMNS =
  'shipment_id,user_id,collection_date,route,requested_start,requested_end,requested_flexible,requested_at,'
  + 'dispatch_start,dispatch_end,dispatch_set_at,change_reason,customer_informed_at,customer_informed_via,reminder_sent_at';

export async function loadSlots(shipmentIds: string[]): Promise<Record<string, CollectionSlot>> {
  if (!shipmentIds.length) return {};
  const map: Record<string, CollectionSlot> = {};
  // Chunked so a long collection day cannot overflow the query string.
  for (let i = 0; i < shipmentIds.length; i += 100) {
    const { data } = await supabase
      .from('collection_slots').select(COLUMNS).in('shipment_id', shipmentIds.slice(i, i + 100));
    for (const row of (data as unknown as CollectionSlot[]) || []) map[row.shipment_id] = row;
  }
  return map;
}

export async function setDispatchWindow(shipmentId: string, start: string, end: string, reason?: string) {
  const { data, error } = await supabase.rpc('dispatch_set_collection_slot', {
    p_shipment_id: shipmentId, p_start: start, p_end: end, p_reason: reason || null,
  });
  if (error) throw error;
  return data as CollectionSlot & { moved: boolean };
}

export async function markCustomerInformed(shipmentId: string, via: 'whatsapp' | 'call' | 'sms' | 'in_person', note?: string) {
  const { error } = await supabase.rpc('mark_collection_customer_informed', {
    p_shipment_id: shipmentId, p_via: via, p_note: note || null,
  });
  if (error) throw error;
}

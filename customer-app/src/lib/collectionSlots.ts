import { supabase } from './supabase';

/**
 * Collection time slots.
 *
 * Two days before a collection the customer is asked to pick a two-hour window
 * they will be in. Dispatch then sequences the day's route around those
 * answers, and when it cannot honour one it says so — and owes the customer a
 * WhatsApp or a call, which the staff app tracks separately from the in-app
 * notice.
 */

export type CollectionSlot = {
  shipment_id: string;
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
  reminder_sent_at: string | null;
};

/** 07:00–23:00 in two-hour windows — the day the drivers actually work. */
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

/** Postgres hands back "09:00:00"; the UI only ever wants "09:00". */
export function hhmm(value?: string | null): string {
  return String(value || '').slice(0, 5);
}

export function windowLabel(start?: string | null, end?: string | null): string {
  const from = hhmm(start);
  const to = hhmm(end);
  return from && to ? `${from}–${to}` : '';
}

export type SlotState =
  | 'awaiting_customer'      // never replied — this is what the reminder chases
  | 'customer_confirmed'     // they picked, dispatch has not planned yet
  | 'scheduled'              // dispatch planned, and it honours what they asked
  | 'customer_moved'         // they changed their mind after dispatch planned
  | 'dispatch_moved_untold'  // dispatch moved them and nobody has spoken to them
  | 'dispatch_moved_told';   // dispatch moved them and the call was made

/**
 * The slot's state, derived rather than stored, so it can never drift out of
 * step with the timestamps it is made of. Note that being told counts only if
 * it happened *after* the change it is meant to be about — informing a customer
 * on Tuesday does not cover a move made on Wednesday.
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

/** The window that actually applies right now — dispatch's if it has set one. */
export function effectiveWindow(slot?: CollectionSlot | null): string {
  if (!slot) return '';
  if (slot.dispatch_start && slot.dispatch_end) return windowLabel(slot.dispatch_start, slot.dispatch_end);
  if (slot.requested_flexible) return 'Any time';
  return windowLabel(slot.requested_start, slot.requested_end);
}

/** One line describing where the slot stands, for a card or a list row. */
export function slotSummary(slot?: CollectionSlot | null): string {
  switch (slotState(slot)) {
    case 'awaiting_customer': return 'Add a preferred collection time (optional)';
    case 'customer_confirmed': return `You asked for ${effectiveWindow(slot)} — we will confirm it`;
    case 'customer_moved': return `You changed to ${slot!.requested_flexible ? 'any time' : windowLabel(slot!.requested_start, slot!.requested_end)} — we are re-checking`;
    case 'scheduled': return `Time slot: ${effectiveWindow(slot)} confirmed`;
    default: return `Time slot changed to ${effectiveWindow(slot)}`;
  }
}

export async function loadSlot(shipmentId: string): Promise<CollectionSlot | null> {
  const { data } = await supabase
    .from('collection_slots')
    .select('shipment_id,collection_date,route,requested_start,requested_end,requested_flexible,requested_at,dispatch_start,dispatch_end,dispatch_set_at,change_reason,customer_informed_at,reminder_sent_at')
    .eq('shipment_id', shipmentId)
    .maybeSingle();
  return (data as CollectionSlot) ?? null;
}

/** Every slot the signed-in customer has, newest collection first. */
export async function loadMySlots(): Promise<CollectionSlot[]> {
  const { data } = await supabase
    .from('collection_slots')
    .select('shipment_id,collection_date,route,requested_start,requested_end,requested_flexible,requested_at,dispatch_start,dispatch_end,dispatch_set_at,change_reason,customer_informed_at,reminder_sent_at')
    .order('collection_date', { ascending: true })
    .limit(50);
  return (data as CollectionSlot[]) || [];
}

/** True until the database tells us the slot function is not there. */
let slotsSupported = true;
export function collectionSlotsAvailable(): boolean {
  return slotsSupported;
}

export async function confirmSlot(
  shipmentId: string,
  choice: { start: string; end: string } | 'flexible',
): Promise<CollectionSlot> {
  const { data, error } = await supabase.rpc('confirm_collection_slot', {
    p_shipment_id: shipmentId,
    p_start: choice === 'flexible' ? null : choice.start,
    p_end: choice === 'flexible' ? null : choice.end,
    p_flexible: choice === 'flexible',
  });
  if (error) {
    // A build can reach customers before its migration reaches the database.
    // "Function not found" is that, and is not the customer's problem to read.
    if (error.code === 'PGRST202' || /confirm_collection_slot/.test(error.message || '')) {
      slotsSupported = false;
      throw new Error('Choosing a collection time is not switched on yet. Your collection is unaffected — the driver will call ahead on the day.');
    }
    throw error;
  }
  return data as CollectionSlot;
}

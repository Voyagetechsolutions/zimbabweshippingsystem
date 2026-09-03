import { supabase } from './supabase';

/**
 * Collection runs — one route on one date.
 *
 * This is the unit dispatch actually works in: open the Northampton run on the
 * 14th and deal with everything in it. It exists because nothing in the
 * database represented a collection *occurrence* before — `collection_schedules`
 * holds one row per route whose date is edited in place, so the schedule id
 * identifies a route, not a run of it.
 *
 * Bookings join a run automatically on insert, whichever door they came in
 * through, so dispatch never has to file anything by hand.
 */

export type CollectionRunRow = {
  run_id: string | null;
  route: string;
  country: string | null;
  collection_date: string | null;
  status: string;
  driver_run_id: string | null;
  driver_name: string | null;
  shipment_count: number;
  slots_chosen: number;
  needs_contact: number;
};

/** The two synthetic rows the board returns alongside the real runs. */
export const UNASSIGNED_ROUTE = 'Unassigned';
export const STALE_ROUTE = 'Older than 60 days';
export const isSyntheticRun = (row: CollectionRunRow) => row.run_id === null;

export async function loadCollectionRuns(includeDone = false): Promise<CollectionRunRow[]> {
  const { data, error } = await supabase.rpc('collection_run_board', { p_include_done: includeDone });
  if (error) throw error;
  return (data as CollectionRunRow[]) || [];
}

/** Shipment ids in a run, for filtering the route builder down to one group. */
export async function shipmentIdsInRun(runId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('shipments').select('id').eq('collection_run_id', runId).is('deleted_at', null);
  if (error) throw error;
  return ((data as Array<{ id: string }>) || []).map((r) => r.id);
}

/** Re-file one booking — used when dispatch fixes an address on a straggler. */
export async function refileShipment(shipmentId: string): Promise<string | null> {
  const { data, error } = await supabase.rpc('attach_shipment_to_run', { p_shipment_id: shipmentId });
  if (error) throw error;
  return (data as string) ?? null;
}

export function runDateLabel(date: string | null): string {
  if (!date) return 'Date not published';
  return new Date(`${date}T12:00:00`).toLocaleDateString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short',
  });
}

/** Days until the run, or null when it has no date. Negative means overdue. */
export function daysAway(date: string | null): number | null {
  if (!date) return null;
  const target = new Date(`${date}T12:00:00`);
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

export type CollectionDriver = {
  id: string;
  full_name: string | null;
  email: string | null;
  driver_type: string | null;
  on_leave: boolean;
  stops_that_day: number;
  run_route: string | null;
};

/** Drivers who can work a collection, with what they already carry that day. */
export async function loadCollectionDrivers(date: string | null): Promise<CollectionDriver[]> {
  const { data, error } = await supabase.rpc('collection_drivers', { p_date: date });
  if (error) throw error;
  return (data as CollectionDriver[]) || [];
}

/**
 * Put a driver on a whole group in one call, or pass null to take them off.
 *
 * The server builds the run: it creates or reuses the driver's day, adds every
 * collection in the group as a stop, and orders those stops by the windows
 * customers asked for.
 */
export async function assignRunDriver(
  runId: string,
  driverId: string | null,
  vehicle?: string,
): Promise<{ assigned: boolean; stopsAdded?: number; route?: string; date?: string }> {
  const { data, error } = await supabase.rpc('assign_collection_run_driver', {
    p_run_id: runId, p_driver_id: driverId, p_vehicle: vehicle || null,
  });
  if (error) throw error;
  return data as { assigned: boolean; stopsAdded?: number; route?: string; date?: string };
}

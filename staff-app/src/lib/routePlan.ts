import { supabase } from './supabase';
import { getDriverLocation } from './driverLocation';
import { isMissingBackend, isNetworkError } from './offlineQueue';
import { optimiseRoute, type RoutePoint } from './routeOptimiser';
import type { RouteCollection } from './collections';

/**
 * Turning a day's collections into a run the driver works through.
 *
 * The ordering happens on the phone (see routeOptimiser) and the result is
 * sent to the server as an order, not as a request to order — so the sequence
 * the driver approved is exactly the sequence that gets stored, and a driver
 * who has dragged stops around never has the server second-guess them.
 */

export type RunStop = {
  stopId: string;
  shipmentId: string;
  stopOrder: number;
  status: 'planned' | 'en_route' | 'arrived' | 'completed' | 'failed';
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  arrivedAt: string | null;
  completedAt: string | null;
  customerReference: string | null;
  trackingNumber: string | null;
  customerName: string | null;
  phone: string | null;
  /** False until an admin has confirmed the address. Warns, never blocks. */
  addressVerified: boolean | null;
  /** 'exact' | 'approximate' | 'manual' | null — null means never geocoded. */
  geocodePrecision: string | null;
};

export type DriverRun = {
  runId: string;
  routeName: string | null;
  status: 'planned' | 'active' | 'completed' | 'cancelled';
  date: string;
  startedAt: string | null;
  stops: RunStop[];
};

export const isStopOutstanding = (stop: RunStop) =>
  stop.status !== 'completed' && stop.status !== 'failed';

/**
 * A stop the driver should be warned about before setting off.
 *
 * Either nobody has checked the address, or the only point we could find was a
 * town centroid. Both are navigable — the agreed rule is warn, never block —
 * but the driver should know before they drive to it.
 */
export const isStopLocationDoubtful = (stop: RunStop) =>
  !stop.addressVerified ||
  stop.geocodePrecision == null ||
  stop.geocodePrecision === 'approximate';

const pointOf = (c: Pick<RouteCollection, 'latitude' | 'longitude'>): RoutePoint | null =>
  c.latitude != null && c.longitude != null
    ? { latitude: c.latitude, longitude: c.longitude }
    : null;

export type PlannedRoute = {
  ordered: RouteCollection[];
  /** Collections with no usable point — still the driver's work, shown last. */
  unplaceable: RouteCollection[];
  straightLineKm: number;
  /** False when we could not get a fix, so the ordering is anchored on a stop. */
  usedDriverLocation: boolean;
};

/**
 * Order a route's collections for driving, from where the driver is standing.
 *
 * A refused permission or no fix indoors is not an error: the route is still
 * ordered, just anchored on the first stop instead, and the caller is told so
 * it can say as much.
 */
export async function planRoute(collections: RouteCollection[]): Promise<PlannedRoute> {
  const outcome = await getDriverLocation();
  const result = optimiseRoute(outcome.point, collections, pointOf);
  return {
    ordered: result.ordered,
    unplaceable: result.unplaceable,
    straightLineKm: result.straightLineKm,
    usedDriverLocation: outcome.status === 'ok',
  };
}

export type StartRouteResult =
  | { ok: true; runId: string; added: number }
  | { ok: false; reason: 'offline' | 'not-deployed' | 'error'; message: string };

/**
 * Start (or add to) today's run with these collections, in this order.
 *
 * Safe to call twice: the routine skips shipments already on the run, so a
 * double tap cannot duplicate a collection.
 */
export async function startRoute(
  routeName: string | null,
  ordered: Array<Pick<RouteCollection, 'shipmentId'>>,
  date?: string,
): Promise<StartRouteResult> {
  const shipmentIds = ordered.map((c) => c.shipmentId).filter(Boolean);
  if (!shipmentIds.length) {
    return { ok: false, reason: 'error', message: 'There are no collections on this route.' };
  }

  const { data, error } = await supabase.rpc('start_collection_route', {
    p_route_name: routeName,
    p_shipment_ids: shipmentIds,
    p_date: date ?? null,
  });

  if (error) {
    if (isNetworkError(error)) {
      return {
        ok: false,
        reason: 'offline',
        message: 'No signal. Try again once you have a bar or two.',
      };
    }
    if (isMissingBackend(error)) {
      return {
        ok: false,
        reason: 'not-deployed',
        message: 'This app is newer than the database. Ask the office to run the setup.',
      };
    }
    return { ok: false, reason: 'error', message: error.message };
  }

  const result = data as { runId?: string; added?: number } | null;
  if (!result?.runId) {
    return { ok: false, reason: 'error', message: 'The route did not start. Try again.' };
  }
  return { ok: true, runId: result.runId, added: Number(result.added || 0) };
}

/** The driver's own run for a date, or null when they have not started one. */
export async function loadRun(date?: string): Promise<DriverRun | null> {
  const { data, error } = await supabase.rpc('driver_run_for_date', { p_date: date ?? null });
  if (error) {
    // A missing routine is not worth an error on screen: the driver simply has
    // no run yet as far as this build can tell.
    if (isMissingBackend(error)) return null;
    throw error;
  }
  return (data as DriverRun | null) ?? null;
}

/**
 * Persist a reordering.
 *
 * Only outstanding stops are sent; the server keeps finished ones where they
 * are. Returns false rather than throwing on a network failure, because the
 * list on screen is already in the new order and losing it would be worse than
 * a stale sequence on the server — the next successful save fixes it.
 */
export async function saveStopOrder(runId: string, orderedStopIds: string[]): Promise<boolean> {
  const { error } = await supabase.rpc('reorder_driver_stops', {
    p_run_id: runId,
    p_stop_ids: orderedStopIds,
  });
  if (error) {
    if (isNetworkError(error) || isMissingBackend(error)) return false;
    throw error;
  }
  return true;
}

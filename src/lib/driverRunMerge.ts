import type { RouteCollection, StopStatus } from './driverOps';

// A driver's own run, folded into today's route.
//
// Dispatch can put a collection on a driver's run from the Runs screen — by
// hand, or by assigning a route or a collection group. Those stops live on
// `driver_runs` / `driver_run_stops`, not in the shared route feed, so a driver
// dashboard that reads only the feed never shows them. This is the website's
// copy of the staff app's `loadAssignedStops` merge: the driver's run comes
// first in dispatch's order, and the rest of the route follows without repeats.

export type RunStopRow = {
  id: string;
  run_id: string;
  shipment_id: string;
  stop_order: number;
  status: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  recipient_name: string | null;
  time_window_start: string | null;
  time_window_end: string | null;
  special_instructions: string | null;
  failure_reason: string | null;
  shipment: any;
};

export type RunSummary = { id: string; status: string; route_name: string | null };

const STOP_STATUSES: StopStatus[] = ['planned', 'en_route', 'arrived', 'completed', 'failed'];

export function runStopToCollection(row: RunStopRow, run: RunSummary | undefined, driverId: string): RouteCollection {
  const shipment = Array.isArray(row.shipment) ? row.shipment[0] : row.shipment;
  const metadata = shipment?.metadata || {};
  const sender = metadata.sender || metadata.senderDetails || {};
  const stopStatus = (STOP_STATUSES.includes(row.status as StopStatus) ? row.status : 'planned') as StopStatus;
  const collected = stopStatus === 'completed'
    || String(shipment?.collection_status || '').toLowerCase() === 'collected'
    || String(shipment?.status || '').toLowerCase() === 'collected';

  return {
    shipmentId: row.shipment_id,
    trackingNumber: shipment?.tracking_number ?? null,
    customerReference: shipment?.customer_reference ?? null,
    customerName: row.recipient_name
      || [sender.firstName, sender.lastName].filter(Boolean).join(' ').trim()
      || sender.name || 'Collection customer',
    phone: sender.phone || sender.additionalPhone || null,
    // The stop's address was written whole (street, town, postcode) when the
    // stop was made, so it is not split again here.
    address: row.address || sender.address || null,
    city: row.address ? '' : (sender.city || ''),
    postcode: row.address ? '' : (sender.postcode || sender.postalCode || ''),
    route: run?.route_name || metadata.collection?.route || null,
    goodsDescription: shipment?.goods_description || metadata.shipment?.description || row.special_instructions || null,
    collectionStatus: collected ? 'Collected' : (shipment?.collection_status ?? null),
    // A stop keeps the coordinates the booking had when it was made; a pin
    // geocoded afterwards is better than none.
    latitude: row.latitude ?? shipment?.pickup_latitude ?? null,
    longitude: row.longitude ?? shipment?.pickup_longitude ?? null,
    stopId: row.id,
    claimId: null,
    claimStatus: stopStatus === 'planned' ? 'claimed' : stopStatus,
    claimedBy: driverId,
    claimedByName: null,
    claimedAt: null,
    dispatched: true,
    runId: row.run_id,
    runStatus: run?.status ?? null,
    routeName: run?.route_name ?? null,
    stopStatus,
    stopOrder: row.stop_order,
    windowStart: row.time_window_start,
    windowEnd: row.time_window_end,
  };
}

export function mergeRunWithRoute(
  runStops: Array<RouteCollection & { failureReason?: string | null }>,
  feed: RouteCollection[],
  driverId: string,
): { mine: RouteCollection[]; others: RouteCollection[] } {
  const feedById = new Map(feed.map((c) => [c.shipmentId, c]));
  const mine = runStops
    // A released collection is back on the shared route for anyone to take;
    // keeping its dead stop here would hide it from this driver too.
    .filter((stop) => !(stop.stopStatus === 'failed' && stop.failureReason === 'released'))
    .map((stop) => {
      const fromFeed = feedById.get(stop.shipmentId);
      // A stop the driver claimed from the route is theirs to release; one
      // dispatch assigned is not, because there is no claim behind it.
      const claimedHere = Boolean(fromFeed?.claimId && fromFeed.claimedBy === driverId
        && ['claimed', 'en_route', 'arrived'].includes(fromFeed.claimStatus));
      const { failureReason: _unused, ...rest } = stop;
      return {
        ...rest,
        goodsDescription: fromFeed?.goodsDescription || stop.goodsDescription,
        phone: stop.phone || fromFeed?.phone || null,
        claimId: claimedHere ? fromFeed!.claimId : null,
        dispatched: !claimedHere,
      };
    })
    .sort((a, b) => (a.stopOrder ?? 0) - (b.stopOrder ?? 0));
  const onRun = new Set(mine.map((stop) => stop.shipmentId));
  return { mine, others: feed.filter((c) => !onRun.has(c.shipmentId)) };
}

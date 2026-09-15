import { describe, expect, it } from 'vitest';
import { mergeRunWithRoute, runStopToCollection, type RunStopRow } from './driverRunMerge';
import type { RouteCollection } from './driverOps';

const DRIVER = 'driver-1';

const row = (id: string, order: number, extra: Partial<RunStopRow> = {}): RunStopRow => ({
  id: `stop-${id}`, run_id: 'run-1', shipment_id: id, stop_order: order, status: 'planned',
  address: '1 High St, Northampton, NN1 1AA', latitude: 52.2, longitude: -0.9, recipient_name: null,
  time_window_start: null, time_window_end: null, special_instructions: null, failure_reason: null,
  shipment: { metadata: { sender: { firstName: 'Rudo', lastName: 'Moyo', phone: '07123456789' } }, tracking_number: `T-${id}`, collection_status: 'Awaiting Collection', status: 'Booking Confirmed' },
  ...extra,
});

const feedItem = (id: string, extra: Partial<RouteCollection> = {}): RouteCollection => ({
  shipmentId: id, trackingNumber: `T-${id}`, customerReference: null, customerName: 'Feed customer', phone: null,
  address: 'Somewhere', city: '', postcode: '', route: 'NORTHAMPTON', goodsDescription: '2 boxes (from the feed)',
  collectionStatus: 'Awaiting Collection', latitude: null, longitude: null, stopId: null, claimId: null,
  claimStatus: 'available', claimedBy: null, claimedByName: null, claimedAt: null, ...extra,
});

const RUN = { id: 'run-1', status: 'planned', route_name: 'HAND BUILT' };

describe('runStopToCollection', () => {
  it('shapes a dispatched stop like any other collection the driver owns', () => {
    const c = runStopToCollection(row('a', 2, { time_window_start: '2026-09-15T08:00:00Z' }), RUN, DRIVER);
    expect(c).toMatchObject({
      shipmentId: 'a', customerName: 'Rudo Moyo', phone: '07123456789', stopId: 'stop-a', claimStatus: 'claimed',
      claimedBy: DRIVER, dispatched: true, runStatus: 'planned', routeName: 'HAND BUILT', stopOrder: 2,
      address: '1 High St, Northampton, NN1 1AA', city: '', postcode: '',
    });
  });

  it('reads a completed stop as collected', () => {
    expect(runStopToCollection(row('a', 1, { status: 'completed' }), RUN, DRIVER).collectionStatus).toBe('Collected');
  });
});

describe('mergeRunWithRoute', () => {
  it('puts the run first in dispatch order and drops its bookings from the rest of the route', () => {
    const stops = [row('b', 2), row('a', 1)].map((r) => runStopToCollection(r, RUN, DRIVER));
    const { mine, others } = mergeRunWithRoute(stops, [feedItem('a'), feedItem('c')], DRIVER);
    expect(mine.map((c) => c.shipmentId)).toEqual(['a', 'b']);
    expect(mine[0].goodsDescription).toBe('2 boxes (from the feed)');
    expect(others.map((c) => c.shipmentId)).toEqual(['c']);
  });

  it('keeps a self-claimed stop releasable', () => {
    const stops = [runStopToCollection(row('a', 1), RUN, DRIVER)];
    const { mine } = mergeRunWithRoute(stops, [feedItem('a', { claimId: 'claim-1', claimedBy: DRIVER, claimStatus: 'claimed' })], DRIVER);
    expect(mine[0]).toMatchObject({ claimId: 'claim-1', dispatched: false });
  });

  it('hands a released collection back to the shared route', () => {
    const released = { ...runStopToCollection(row('a', 1, { status: 'failed' }), RUN, DRIVER), failureReason: 'released' };
    const { mine, others } = mergeRunWithRoute([released], [feedItem('a')], DRIVER);
    expect(mine).toEqual([]);
    expect(others.map((c) => c.shipmentId)).toEqual(['a']);
  });
});

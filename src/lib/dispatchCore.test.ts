import { describe, expect, it } from 'vitest';
import {
  buildRouteGroups, daysAway, dayLabel, internationalDigits, isoDay, mergeDriverPositions, overridesCustomer,
  parseTime, planRouteStops, slotState, stampToTime, whatsappUrl, windowProblem, windowStamp,
  type BoardShipment, type CollectionSlot, type OpenStop, type RunRow, type StopRow,
} from './dispatchCore';

const NOW = new Date(2026, 8, 15, 10, 0, 0); // 15 Sep 2026, local

const shipment = (id: string, extra: Partial<BoardShipment> = {}, metadata: any = {}): BoardShipment => ({
  id, tracking_number: `TRK-${id}`, customer_reference: null, status: 'Booking Confirmed',
  collection_status: 'Awaiting Collection', collection_schedule_id: null, metadata, ...extra,
});

const run = (id: string, extra: Partial<RunRow> = {}): RunRow => ({
  id, driver_id: 'driver-1', status: 'planned', run_date: '2026-09-15', run_type: 'pickup', route_name: null,
  vehicle_label: null, scheduled_start: null, scheduled_end: null, started_at: null, completed_at: null, ...extra,
});

const slot = (extra: Partial<CollectionSlot>): CollectionSlot => ({
  shipment_id: 's1', user_id: null, collection_date: '2026-09-15', route: null,
  requested_start: null, requested_end: null, requested_flexible: false, requested_at: null,
  dispatch_start: null, dispatch_end: null, dispatch_set_at: null, change_reason: null,
  customer_informed_at: null, customer_informed_via: null, reminder_sent_at: null, ...extra,
});

describe('dates', () => {
  it('names the days around today', () => {
    expect(isoDay(0, NOW)).toBe('2026-09-15');
    expect(isoDay(1, NOW)).toBe('2026-09-16');
    expect(dayLabel('2026-09-15', NOW)).toBe('Today');
    expect(dayLabel('2026-09-16', NOW)).toBe('Tomorrow');
    expect(dayLabel('2026-09-14', NOW)).toBe('Yesterday');
  });

  it('counts days to a run, negative when overdue', () => {
    expect(daysAway('2026-09-17', NOW)).toBe(2);
    expect(daysAway('2026-09-13', NOW)).toBe(-2);
    expect(daysAway(null, NOW)).toBeNull();
  });
});

describe('phone links', () => {
  it('turns national numbers into WhatsApp digits for the collection country', () => {
    expect(internationalDigits('07123 456789')).toBe('447123456789');
    expect(internationalDigits('087 123 4567', 'Ireland')).toBe('353871234567');
    expect(internationalDigits('+353 87 123 4567', 'United Kingdom')).toBe('353871234567');
    expect(internationalDigits('0044 7123 456789')).toBe('447123456789');
  });

  it('refuses a number too short to dial', () => {
    expect(whatsappUrl('123')).toBeNull();
    expect(whatsappUrl('07123 456789', 'United Kingdom', 'Hi')).toBe('https://wa.me/447123456789?text=Hi');
  });
});

describe('time windows', () => {
  it('accepts the ways people type a time', () => {
    expect(parseTime('9')).toBe(540);
    expect(parseTime('930')).toBe(570);
    expect(parseTime('09:30')).toBe(570);
    expect(parseTime('9.30')).toBe(570);
    expect(parseTime('24:00')).toBeNull();
    expect(parseTime('soon')).toBeNull();
  });

  it('round-trips a window through the stored timestamp', () => {
    const stamp = windowStamp('2026-09-15', '14:30');
    expect(stamp).not.toBeNull();
    expect(stampToTime(stamp)).toBe('14:30');
  });

  it('explains what is wrong with a window', () => {
    expect(windowProblem('', '')).toBeNull();
    expect(windowProblem('09:00', '11:00')).toBeNull();
    expect(windowProblem('09:00', '')).toMatch(/both/);
    expect(windowProblem('11:00', '09:00')).toMatch(/end after/);
    expect(windowProblem('06:00', '08:00')).toMatch(/07:00 and 23:00/);
    expect(windowProblem('nine', '11')).toMatch(/24-hour/);
  });
});

describe('collection slots', () => {
  it('derives the contact obligation from the timestamps', () => {
    expect(slotState(slot({}))).toBe('awaiting_customer');
    expect(slotState(slot({ requested_at: '2026-09-13T10:00:00Z', requested_start: '09:00:00', requested_end: '11:00:00' })))
      .toBe('customer_confirmed');
    const moved = slot({
      requested_at: '2026-09-13T10:00:00Z', requested_start: '09:00:00', requested_end: '11:00:00',
      dispatch_set_at: '2026-09-14T10:00:00Z', dispatch_start: '13:00:00', dispatch_end: '15:00:00',
    });
    expect(slotState(moved)).toBe('dispatch_moved_untold');
    expect(slotState({ ...moved, customer_informed_at: '2026-09-13T12:00:00Z' })).toBe('dispatch_moved_untold');
    expect(slotState({ ...moved, customer_informed_at: '2026-09-14T11:00:00Z' })).toBe('dispatch_moved_told');
    expect(slotState({ ...moved, requested_flexible: true })).toBe('scheduled');
  });

  it('flags a window that moves the customer off their choice', () => {
    const chosen = slot({ requested_at: '2026-09-13T10:00:00Z', requested_start: '09:00:00', requested_end: '11:00:00' });
    expect(overridesCustomer(chosen, '9', '11')).toBe(false);
    expect(overridesCustomer(chosen, '13:00', '15:00')).toBe(true);
    expect(overridesCustomer(chosen, '', '')).toBe(false);
    expect(overridesCustomer({ ...chosen, requested_flexible: true }, '13:00', '15:00')).toBe(false);
  });
});

describe('buildRouteGroups', () => {
  const schedules = [
    { id: 'sch-n', route: 'NORTHAMPTON ROUTE', pickup_date: '2026-09-15' },
    { id: 'sch-l', route: 'LEEDS ROUTE', pickup_date: '2026-09-20' },
  ];

  it('groups by the schedule day, not the booking', () => {
    const groups = buildRouteGroups({
      date: '2026-09-15',
      schedules,
      shipments: [
        shipment('a', { collection_schedule_id: 'sch-n' }),
        shipment('b', {}, { collection: { route: 'NORTHAMPTON' } }),
        shipment('c', { collection_schedule_id: 'sch-l' }),
        shipment('d', { collection_schedule_id: 'sch-l' }, { collection: { date: '2026-09-15' } }),
        shipment('e', { collection_schedule_id: 'sch-n', collection_status: 'Collected' }),
      ],
      runs: [],
      stops: [],
    });
    expect(groups.map((g) => [g.route, g.shipments.map((s) => s.id)])).toEqual([
      ['LEEDS ROUTE', ['d']],
      ['NORTHAMPTON ROUTE', ['a', 'b']],
    ]);
  });

  it('attaches a run to its route whichever way the name is spelt', () => {
    const stops: StopRow[] = [
      { id: 'st1', run_id: 'r1', shipment_id: 'a', status: 'completed', stop_order: 1, stop_type: 'collection', latitude: null, longitude: null, address: null },
      { id: 'st2', run_id: 'r1', shipment_id: 'b', status: 'planned', stop_order: 2, stop_type: 'collection', latitude: null, longitude: null, address: null },
    ];
    const groups = buildRouteGroups({
      date: '2026-09-15',
      schedules,
      shipments: [shipment('a', { collection_schedule_id: 'sch-n' })],
      runs: [run('r1', { route_name: 'Northampton' }), run('r2', { route_name: 'Hand built', driver_id: 'driver-2' }), run('r3', { status: 'cancelled', route_name: 'Gone' })],
      stops,
    });
    const northampton = groups.find((g) => g.route === 'NORTHAMPTON ROUTE')!;
    expect(northampton.run?.id).toBe('r1');
    expect([northampton.stopTotal, northampton.stopDone]).toEqual([2, 1]);
    expect(groups.some((g) => g.route === 'Hand built' && g.run?.id === 'r2')).toBe(true);
    expect(groups.some((g) => g.route === 'Gone')).toBe(false);
  });
});

describe('mergeDriverPositions', () => {
  it('keeps the newest position per driver across both sources', () => {
    const merged = mergeDriverPositions(
      [{ driver_id: 'd1', latitude: 52, longitude: -1, accuracy_m: 10, recorded_at: '2026-09-15T08:00:00Z' }],
      [
        { driver_id: 'd1', status: 'on_route', current_latitude: 53, current_longitude: -2, location_accuracy_m: 5, last_location_update: '2026-09-15T09:00:00Z', last_seen: null },
        { driver_id: 'd2', status: 'online', current_latitude: null, current_longitude: null, location_accuracy_m: null, last_location_update: null, last_seen: null },
      ],
    );
    expect(merged).toHaveLength(1);
    expect(merged[0]).toMatchObject({ driver_id: 'd1', latitude: 53, status: 'on_route' });
  });
});

describe('planRouteStops', () => {
  const open = (extra: Partial<OpenStop> & Pick<OpenStop, 'shipmentId' | 'runId'>): OpenStop => ({
    stopId: `stop-${extra.shipmentId}`, status: 'planned', windowStart: null, windowEnd: null, ...extra,
  });

  it('appends new collections earliest window first, after the run’s last stop', () => {
    const plan = planRouteStops({
      runId: 'run-1', runDate: '2026-09-15', runMaxOrder: 4,
      picks: { late: { from: '15:00', to: '17:00' }, none: { from: '', to: '' }, early: { from: '9', to: '11' } },
      openStops: [], slots: {}, removeUnpicked: false,
    });
    expect(plan.inserts.map((i) => [i.shipmentId, i.stopOrder])).toEqual([['early', 5], ['late', 6], ['none', 7]]);
    expect(plan.inserts[2].start).toBeNull();
    expect(plan.slotWrites).toEqual([
      { shipmentId: 'early', from: '09:00', to: '11:00' },
      { shipmentId: 'late', from: '15:00', to: '17:00' },
    ]);
  });

  it('moves a planned stop off another run but leaves one already under way', () => {
    const plan = planRouteStops({
      runId: 'run-1', runDate: '2026-09-15', runMaxOrder: 0,
      picks: { waiting: { from: '', to: '' }, moving: { from: '09:00', to: '11:00' } },
      openStops: [open({ shipmentId: 'waiting', runId: 'run-2' }), open({ shipmentId: 'moving', runId: 'run-3', status: 'en_route' })],
      slots: {}, removeUnpicked: false,
    });
    expect(plan.transfers).toEqual([expect.objectContaining({ stopId: 'stop-waiting', fromRunId: 'run-2', stopOrder: 1 })]);
    expect(plan.blocked).toEqual([{ shipmentId: 'moving', runId: 'run-3', status: 'en_route' }]);
    expect(plan.slotWrites).toEqual([]);
    expect(plan.inserts).toEqual([]);
  });

  it('only rewrites what changed when editing a run', () => {
    const nine = windowStamp('2026-09-15', '09:00');
    const eleven = windowStamp('2026-09-15', '11:00');
    const plan = planRouteStops({
      runId: 'run-1', runDate: '2026-09-15', runMaxOrder: 3,
      picks: { same: { from: '09:00', to: '11:00' }, changed: { from: '13:00', to: '15:00' } },
      openStops: [
        open({ shipmentId: 'same', runId: 'run-1', windowStart: nine, windowEnd: eleven }),
        open({ shipmentId: 'changed', runId: 'run-1', windowStart: nine, windowEnd: eleven }),
        open({ shipmentId: 'dropped', runId: 'run-1' }),
        open({ shipmentId: 'started', runId: 'run-1', status: 'arrived' }),
      ],
      slots: {
        same: { dispatch_start: '09:00:00', dispatch_end: '11:00:00' },
        changed: { dispatch_start: '09:00:00', dispatch_end: '11:00:00' },
      },
      removeUnpicked: true,
    });
    expect(plan.windowUpdates.map((u) => u.shipmentId)).toEqual(['changed']);
    expect(plan.slotWrites).toEqual([{ shipmentId: 'changed', from: '13:00', to: '15:00' }]);
    expect(plan.removals).toEqual([{ stopId: 'stop-dropped', shipmentId: 'dropped' }]);
    expect(plan.inserts).toEqual([]);
  });
});

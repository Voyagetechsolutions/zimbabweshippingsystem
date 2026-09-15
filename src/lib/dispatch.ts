import { supabase } from '@/integrations/supabase/client';
import {
  addressOf, customerName, planRouteStops,
  type BoardShipment, type CollectionDriver, type CollectionRunRow, type CollectionSlot, type DispatchDriver,
  type DriverPosition, type OpenStop, type PresenceRow, type RunRow, type ScheduleRow, type StopPlan, type StopRow,
  type StopStatus, type WindowPick,
} from './dispatchCore';

// Dispatch, the database half.
//
// Every call here is one the staff app's dispatch screens already make, against
// the same tables and RPCs, so the website and the phone can never build two
// different kinds of run. Server-side rules (one run per driver per day, one
// open collection stop per booking, the 07:00–23:00 slot bound) are the
// authority; this file only sequences the calls and words the errors.

const db = supabase as any;

function failure(error: any, fallback: string): Error {
  const message = error?.message || fallback;
  if (/row-level security|permission denied|access required/i.test(message)) {
    return new Error('This account is not allowed to change runs. Dispatch needs an admin or logistics account.');
  }
  return new Error(message);
}

const DRIVER_COLUMNS = 'id,full_name,email,phone_number,driver_type,role,is_admin,on_leave,staff_active,vehicle_label';
// Admin and logistics accounts cover routes too, and today every real driver
// account is an admin — a role-only filter would list nobody.
const DRIVER_FILTER = 'role.eq.driver,role.eq.admin,role.eq.logistics,is_admin.eq.true';
const RUN_COLUMNS = 'id,driver_id,status,run_date,run_type,route_name,vehicle_label,scheduled_start,scheduled_end,started_at,completed_at';
const SHIPMENT_COLUMNS = 'id,tracking_number,customer_reference,status,collection_status,collection_schedule_id,collection_run_id,pickup_latitude,pickup_longitude,created_at,metadata';
const SLOT_COLUMNS = 'shipment_id,user_id,collection_date,route,requested_start,requested_end,requested_flexible,requested_at,'
  + 'dispatch_start,dispatch_end,dispatch_set_at,change_reason,customer_informed_at,customer_informed_via,reminder_sent_at';

export async function loadDrivers(): Promise<DispatchDriver[]> {
  const { data, error } = await db.from('profiles').select(DRIVER_COLUMNS).or(DRIVER_FILTER).order('full_name');
  if (error) throw failure(error, 'Could not load drivers.');
  return (data as DispatchDriver[]) || [];
}

async function inChunks<T>(ids: string[], fetch: (chunk: string[]) => Promise<T[]>): Promise<T[]> {
  const out: T[] = [];
  for (let i = 0; i < ids.length; i += 100) out.push(...await fetch(ids.slice(i, i + 100)));
  return out;
}

// ── The board ────────────────────────────────────────────────────────────────

export type AttendanceRow = { driver_id: string; clocked_in_at: string; clocked_out_at: string | null };
export type ClaimRow = {
  id: string; shipment_id: string; driver_id: string | null; stop_id: string | null;
  status: string; claimed_at: string | null; issue_reason: string | null;
};

export type DispatchBoardData = {
  drivers: DispatchDriver[];
  runs: RunRow[];
  stops: StopRow[];
  shipments: BoardShipment[];
  schedules: ScheduleRow[];
  attendance: AttendanceRow[];
  claims: ClaimRow[];
  positions: DriverPosition[];
  presence: PresenceRow[];
};

export async function loadDispatchBoard(date: string): Promise<DispatchBoardData> {
  const [drivers, runs, shipments, schedules, attendance, claims, locations, presence] = await Promise.all([
    loadDrivers(),
    db.from('driver_runs').select(RUN_COLUMNS).eq('run_date', date).order('created_at'),
    db.from('shipments').select(SHIPMENT_COLUMNS).is('deleted_at', null)
      .not('status', 'in', '(Delivered,Cancelled)').order('created_at', { ascending: false }).limit(400),
    db.from('collection_schedules').select('id,route,pickup_date,country').limit(300),
    db.from('driver_attendance').select('driver_id,clocked_in_at,clocked_out_at').eq('work_date', date),
    db.from('route_collection_claims').select('id,shipment_id,driver_id,stop_id,status,claimed_at,issue_reason').eq('claim_date', date),
    db.from('driver_live_locations').select('driver_id,latitude,longitude,accuracy_m,recorded_at')
      .gte('recorded_at', new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString()),
    db.from('driver_presence')
      .select('driver_id,status,current_latitude,current_longitude,location_accuracy_m,last_location_update,last_seen')
      .neq('status', 'offline'),
  ]);
  for (const result of [runs, shipments, schedules, attendance]) {
    if (result.error) throw failure(result.error, 'Could not load the dispatch board.');
  }
  const runRows = (runs.data as RunRow[]) || [];
  let stops: StopRow[] = [];
  if (runRows.length) {
    const result = await db.from('driver_run_stops')
      .select('id,run_id,shipment_id,status,stop_order,stop_type,latitude,longitude,address')
      .in('run_id', runRows.map((r) => r.id));
    if (result.error) throw failure(result.error, 'Could not load run stops.');
    stops = (result.data as StopRow[]) || [];
  }
  return {
    drivers,
    runs: runRows,
    stops,
    shipments: (shipments.data as BoardShipment[]) || [],
    schedules: (schedules.data as ScheduleRow[]) || [],
    attendance: (attendance.data as AttendanceRow[]) || [],
    // Claims, positions and presence arrived in later migrations; a board
    // that lacks them still has to show the runs.
    claims: claims.error ? [] : ((claims.data as ClaimRow[]) || []),
    positions: locations.error ? [] : ((locations.data as DriverPosition[]) || []),
    presence: presence.error ? [] : ((presence.data as PresenceRow[]) || []),
  };
}

export async function assignRoute(route: string, date: string, driverId: string, runType: 'pickup' | 'delivery') {
  const { data, error } = await db.rpc('assign_route_run', {
    p_route: route, p_run_date: date, p_driver_id: driverId, p_run_type: runType,
  });
  if (error) throw failure(error, 'Could not assign the route.');
  return data as { runId: string; added: number; alreadyAssigned: number };
}

/** Hand a route's run to someone else, then pick up anything booked since. */
export async function reassignRoute(runId: string, route: string, date: string, driverId: string, runType: 'pickup' | 'delivery') {
  const moved = await reassignRunDriver(runId, driverId);
  const topUp = await assignRoute(route, date, driverId, runType).catch(() => null);
  return { ...moved, added: topUp?.added ?? 0 };
}

export async function sendDriverAnnouncement(senderId: string, body: string) {
  const { error } = await db.from('staff_messages').insert({
    sender_id: senderId, recipient_id: null, audience_role: 'driver',
    subject: 'Dispatch announcement', body: body.trim(), priority: 'normal',
  });
  if (error) throw failure(error, 'Could not send the announcement.');
}

// ── One run ──────────────────────────────────────────────────────────────────

export type RunDetailStop = StopRow & {
  completed_at: string | null;
  failure_reason: string | null;
  failure_note: string | null;
  time_window_start: string | null;
  time_window_end: string | null;
  recipient_name: string | null;
  shipment: (BoardShipment & { goods_description?: string | null }) | null;
};

export async function loadSlots(shipmentIds: string[]): Promise<Record<string, CollectionSlot>> {
  const rows = await inChunks(shipmentIds, async (chunk) => {
    const { data } = await db.from('collection_slots').select(SLOT_COLUMNS).in('shipment_id', chunk);
    return (data as CollectionSlot[]) || [];
  });
  return Object.fromEntries(rows.map((row) => [row.shipment_id, row]));
}

export async function loadRunDetail(runId: string) {
  const { data: run, error } = await db.from('driver_runs').select(RUN_COLUMNS).eq('id', runId).maybeSingle();
  if (error) throw failure(error, 'Could not load the run.');
  if (!run) throw new Error('This run no longer exists.');
  const [driverResult, stopResult, drivers] = await Promise.all([
    db.from('profiles').select(DRIVER_COLUMNS).eq('id', run.driver_id).maybeSingle(),
    db.from('driver_run_stops')
      .select('id,run_id,shipment_id,status,stop_order,stop_type,address,latitude,longitude,completed_at,failure_reason,failure_note,time_window_start,time_window_end,recipient_name,'
        + `shipment:shipments(${SHIPMENT_COLUMNS},goods_description)`)
      .eq('run_id', runId).order('stop_order'),
    loadDrivers(),
  ]);
  if (stopResult.error) throw failure(stopResult.error, 'Could not load the stops on this run.');
  const stops = ((stopResult.data as any[]) || []).map((row) => ({
    ...row, shipment: Array.isArray(row.shipment) ? row.shipment[0] : row.shipment,
  })) as RunDetailStop[];
  const slots = await loadSlots(stops.filter((s) => s.stop_type === 'collection').map((s) => s.shipment_id)).catch(() => ({}));
  return { run: run as RunRow, driver: (driverResult.data as DispatchDriver) || null, stops, drivers, slots };
}

export async function reorderStop(stopId: string, direction: 'up' | 'down'): Promise<boolean> {
  const { data, error } = await db.rpc('reorder_run_stop', { p_stop_id: stopId, p_direction: direction });
  if (error) throw failure(error, 'Could not move the stop.');
  return (data as any)?.moved !== false;
}

export async function removeStop(stopId: string) {
  const { error } = await db.rpc('remove_run_stop', { p_stop_id: stopId });
  if (error) throw failure(error, 'Could not remove the stop.');
}

export async function reassignRunDriver(runId: string, driverId: string) {
  const { data, error } = await db.rpc('reassign_run_driver', { p_run_id: runId, p_driver_id: driverId });
  if (error) throw failure(error, 'Could not reassign the run.');
  return data as { runId: string; merged: boolean; movedStops?: number };
}

/** Releases the open stops for replanning, then cancels the run itself. */
export async function cancelRun(runId: string, stops: Array<{ id: string; status: string }>) {
  const open = stops.filter((s) => !['completed', 'failed'].includes(s.status));
  let kept = 0;
  for (const stop of open) {
    const { error } = await db.rpc('remove_run_stop', { p_stop_id: stop.id });
    if (error) kept += 1;
  }
  const { error } = await db.from('driver_runs')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() }).eq('id', runId);
  if (error) throw failure(error, 'Could not cancel the run.');
  return { released: open.length - kept, kept };
}

export async function reinstateRun(runId: string) {
  const { error } = await db.from('driver_runs')
    .update({ status: 'planned', completed_at: null, updated_at: new Date().toISOString() }).eq('id', runId);
  if (error) throw failure(error, 'Could not reinstate the run.');
}

export async function updateRunDetails(runId: string, patch: {
  route_name: string; vehicle_label: string | null; scheduled_start: string | null; scheduled_end: string | null;
}) {
  const { error } = await db.from('driver_runs').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', runId);
  if (error) throw failure(error, 'Could not save the run.');
}

export async function setDispatchWindow(shipmentId: string, start: string, end: string, reason?: string) {
  const { data, error } = await db.rpc('dispatch_set_collection_slot', {
    p_shipment_id: shipmentId, p_start: start, p_end: end, p_reason: reason?.trim() || null,
  });
  if (error) throw failure(error, 'Could not record the collection window.');
  return data as CollectionSlot & { moved: boolean };
}

export async function markCustomerInformed(shipmentId: string, via: 'whatsapp' | 'call' | 'sms' | 'in_person', note?: string) {
  const { error } = await db.rpc('mark_collection_customer_informed', {
    p_shipment_id: shipmentId, p_via: via, p_note: note?.trim() || null,
  });
  if (error) throw failure(error, 'Could not record that the customer was told.');
}

/**
 * Change one stop's window: the stop carries it for the driver, the slot
 * carries it for the customer. Clearing a window clears only the stop — the
 * customer's agreed slot is not unset behind their back.
 */
export async function updateStopWindow(input: {
  stopId: string; shipmentId: string; start: string | null; end: string | null;
  slotWindow: { from: string; to: string } | null; reason?: string;
}): Promise<{ moved: boolean }> {
  const { error } = await db.from('driver_run_stops')
    .update({ time_window_start: input.start, time_window_end: input.end, updated_at: new Date().toISOString() })
    .eq('id', input.stopId);
  if (error) throw failure(error, 'Could not save the window.');
  if (!input.slotWindow) return { moved: false };
  const result = await setDispatchWindow(input.shipmentId, input.slotWindow.from, input.slotWindow.to, input.reason);
  return { moved: Boolean(result?.moved) };
}

// ── Collection groups ────────────────────────────────────────────────────────

export async function loadCollectionRuns(includeDone = false): Promise<CollectionRunRow[]> {
  const { data, error } = await db.rpc('collection_run_board', { p_include_done: includeDone });
  if (error) throw failure(error, 'Could not load collection groups.');
  return (data as CollectionRunRow[]) || [];
}

export async function loadCollectionDrivers(date: string | null): Promise<CollectionDriver[]> {
  const { data, error } = await db.rpc('collection_drivers', { p_date: date });
  if (error) throw failure(error, 'Could not load drivers.');
  return (data as CollectionDriver[]) || [];
}

export async function assignCollectionRunDriver(runId: string, driverId: string | null) {
  const { data, error } = await db.rpc('assign_collection_run_driver', {
    p_run_id: runId, p_driver_id: driverId, p_vehicle: null,
  });
  if (error) throw failure(error, 'Could not assign the driver.');
  return data as { assigned: boolean; driverRunId?: string; stopsAdded?: number; route?: string; date?: string };
}

// ── Building and editing a run by hand ───────────────────────────────────────

export type BuilderData = {
  shipments: BoardShipment[];
  schedules: ScheduleRow[];
  drivers: DispatchDriver[];
  slots: Record<string, CollectionSlot>;
  openStops: OpenStop[];
  /** Every run the open stops sit on, plus every run on the chosen day. */
  runs: RunRow[];
  /** The run being edited, when there is one. */
  run: RunRow | null;
  /** Closed stops on the edited run, which cannot be changed from here. */
  closedStops: Array<{ shipmentId: string; status: StopStatus }>;
};

const PENDING = ['booking confirmed', 'confirmed', 'pending'];

export async function loadBuilderData(input: { date: string; runId?: string | null; collectionRunId?: string | null }): Promise<BuilderData> {
  const [shipmentResult, scheduleResult, drivers, openResult, dayRuns, editRun] = await Promise.all([
    db.from('shipments').select(SHIPMENT_COLUMNS).is('deleted_at', null).order('created_at', { ascending: false }).limit(1000),
    db.from('collection_schedules').select('id,route,country,pickup_date').limit(300),
    loadDrivers(),
    db.from('driver_run_stops').select('id,run_id,shipment_id,status,time_window_start,time_window_end')
      .eq('stop_type', 'collection').in('status', ['planned', 'en_route', 'arrived']).limit(5000),
    db.from('driver_runs').select(RUN_COLUMNS).eq('run_date', input.date),
    input.runId ? db.from('driver_runs').select(RUN_COLUMNS).eq('id', input.runId).maybeSingle() : Promise.resolve({ data: null, error: null }),
  ]);
  if (shipmentResult.error) throw failure(shipmentResult.error, 'Could not load open collections.');
  if (openResult.error) throw failure(openResult.error, 'Could not load the stops already planned.');
  if (editRun.error) throw failure(editRun.error, 'Could not load the run.');
  if (input.runId && !editRun.data) throw new Error('This run no longer exists.');

  // `collection_status` is stale across this data, so the booking status is
  // what decides whether something is still route material.
  const all = (shipmentResult.data as BoardShipment[]) || [];
  let shipments = all
    .filter((s) => String(s.collection_status || 'Awaiting Collection') !== 'Collected')
    .filter((s) => PENDING.includes(String(s.status || '').toLowerCase()));
  if (input.collectionRunId) shipments = shipments.filter((s) => s.collection_run_id === input.collectionRunId);

  const openStops: OpenStop[] = ((openResult.data as any[]) || []).map((row) => ({
    stopId: row.id, runId: row.run_id, shipmentId: row.shipment_id, status: row.status,
    windowStart: row.time_window_start, windowEnd: row.time_window_end,
  }));

  // An edited run's own bookings stay listed whatever their status says, so
  // the builder can never read "not listed" as "take it off the run".
  let closedStops: BuilderData['closedStops'] = [];
  if (input.runId) {
    const onRun = await db.from('driver_run_stops')
      .select(`shipment_id,status,shipment:shipments(${SHIPMENT_COLUMNS})`).eq('run_id', input.runId);
    if (onRun.error) throw failure(onRun.error, 'Could not load the stops on this run.');
    const listed = new Set(shipments.map((s) => s.id));
    for (const row of (onRun.data as any[]) || []) {
      const shipment = Array.isArray(row.shipment) ? row.shipment[0] : row.shipment;
      if (['completed', 'failed'].includes(row.status)) closedStops.push({ shipmentId: row.shipment_id, status: row.status });
      else if (shipment && !listed.has(shipment.id)) { shipments.push(shipment); listed.add(shipment.id); }
    }
    const closedIds = new Set(closedStops.map((s) => s.shipmentId));
    shipments = shipments.filter((s) => !closedIds.has(s.id));
  }

  const knownRuns = new Map<string, RunRow>(((dayRuns.data as RunRow[]) || []).map((r) => [r.id, r]));
  if (editRun.data) knownRuns.set(editRun.data.id, editRun.data);
  const missing = [...new Set(openStops.map((s) => s.runId))].filter((id) => !knownRuns.has(id));
  const extra = await inChunks(missing, async (chunk) => {
    const { data } = await db.from('driver_runs').select(RUN_COLUMNS).in('id', chunk);
    return (data as RunRow[]) || [];
  });
  extra.forEach((r) => knownRuns.set(r.id, r));

  const slots = await loadSlots(shipments.map((s) => s.id)).catch(() => ({}));
  return {
    shipments,
    schedules: scheduleResult.error ? [] : ((scheduleResult.data as ScheduleRow[]) || []),
    drivers,
    slots,
    openStops,
    runs: [...knownRuns.values()],
    run: (editRun.data as RunRow) || null,
    closedStops,
  };
}

export type SaveRouteResult = {
  runId: string;
  added: number;
  transferred: number;
  removed: number;
  windowsChanged: number;
  blocked: string[];
  movedCustomers: string[];
  warnings: string[];
};

/**
 * Create a run, or change one, from the builder's selection.
 *
 * One run per driver per day is a database rule, so an existing run for the
 * driver on that day is extended rather than duplicated, and reopened if it
 * had been cancelled or finished — otherwise the driver would never see the
 * stops just added to it.
 */
export async function saveRoute(input: {
  date: string;
  driverId: string;
  routeName: string;
  picks: Record<string, WindowPick>;
  reason: string;
  createdBy: string | null;
  collectionRunId?: string | null;
  data: BuilderData;
}): Promise<SaveRouteResult> {
  const { date, driverId, picks, data } = input;
  const routeName = input.routeName.trim();
  const editing = data.run;
  const existing = editing || data.runs.find((r) => r.driver_id === driverId && r.run_date === date) || null;

  let runMaxOrder = 0;
  if (existing) {
    const { data: last, error } = await db.from('driver_run_stops')
      .select('stop_order').eq('run_id', existing.id).order('stop_order', { ascending: false }).limit(1);
    if (error) throw failure(error, 'Could not read the run.');
    runMaxOrder = Number(last?.[0]?.stop_order) || 0;
  }

  const plan: StopPlan = planRouteStops({
    runId: existing?.id ?? null, runDate: date, runMaxOrder, picks,
    openStops: data.openStops, slots: data.slots, removeUnpicked: Boolean(editing),
  });
  const byId = new Map(data.shipments.map((s) => [s.id, s]));
  const nameOf = (id: string) => customerName(byId.get(id));
  const now = new Date().toISOString();
  const warnings: string[] = [];

  // The run.
  let runId: string;
  const addsWork = plan.inserts.length + plan.transfers.length > 0;
  if (existing) {
    const patch: Record<string, unknown> = { route_name: routeName, updated_at: now };
    if (addsWork && ['cancelled', 'completed'].includes(existing.status)) Object.assign(patch, { status: 'planned', completed_at: null });
    const { error } = await db.from('driver_runs').update(patch).eq('id', existing.id);
    if (error) throw failure(error, 'Could not update the run.');
    runId = existing.id;
  } else {
    const { data: created, error } = await db.from('driver_runs').insert({
      driver_id: driverId, run_date: date, status: 'planned',
      // run_type is pickup or delivery; a collection run is a pickup run.
      run_type: 'pickup', route_name: routeName, created_by: input.createdBy,
    }).select('id').single();
    if (error) throw failure(error, 'Could not create the run.');
    runId = created.id;
  }

  // Tie the run back to its collection group so the groups list shows who has it.
  if (input.collectionRunId) {
    const { error } = await db.from('collection_runs').update({ driver_run_id: runId, status: 'active' }).eq('id', input.collectionRunId);
    if (error) warnings.push('The collection group was not linked to this run.');
  }

  for (const removal of plan.removals) {
    const { error } = await db.rpc('remove_run_stop', { p_stop_id: removal.stopId });
    if (error) warnings.push(`${nameOf(removal.shipmentId)} could not be taken off: ${error.message}`);
  }

  for (const move of plan.transfers) {
    const { error } = await db.from('driver_run_stops').update({
      run_id: runId, stop_order: move.stopOrder, time_window_start: move.start, time_window_end: move.end, updated_at: now,
    }).eq('id', move.stopId).eq('status', 'planned');
    if (error) throw failure(error, `Could not move ${nameOf(move.shipmentId)} onto this run.`);
    // A claim follows its stop, or the route feed would keep naming the old driver.
    await db.from('route_collection_claims').update({ driver_id: driverId, claim_date: date, updated_at: now })
      .eq('stop_id', move.stopId).in('status', ['claimed', 'en_route', 'arrived']);
  }

  if (plan.inserts.length) {
    const rows = plan.inserts.map((insert) => {
      const shipment = byId.get(insert.shipmentId);
      return {
        run_id: runId,
        shipment_id: insert.shipmentId,
        stop_order: insert.stopOrder,
        stop_type: 'collection',
        status: 'planned',
        address: addressOf(shipment) || null,
        latitude: shipment?.pickup_latitude ?? null,
        longitude: shipment?.pickup_longitude ?? null,
        recipient_name: customerName(shipment),
        time_window_start: insert.start,
        time_window_end: insert.end,
      };
    });
    const { error } = await db.from('driver_run_stops').insert(rows);
    if (error) throw failure(error, 'Could not add the collections to the run.');
  }

  for (const update of plan.windowUpdates) {
    const { error } = await db.from('driver_run_stops')
      .update({ time_window_start: update.start, time_window_end: update.end, updated_at: now }).eq('id', update.stopId);
    if (error) warnings.push(`The window for ${nameOf(update.shipmentId)} was not saved.`);
  }

  // Assigned, so the shared route shows these as taken rather than free to claim.
  const assignedIds = [...plan.inserts, ...plan.transfers].map((s) => s.shipmentId);
  if (assignedIds.length) {
    const { error } = await db.from('shipments')
      .update({ assigned_driver_id: driverId, driver_status: 'assigned', updated_at: now }).in('id', assignedIds);
    if (error) warnings.push('The bookings were not marked as assigned; other drivers may still see them as free.');
  }

  // The slot is what notifies a customer moved off their chosen time. A slot
  // that will not save must not undo a run that is already sound.
  const movedCustomers: string[] = [];
  for (const write of plan.slotWrites) {
    try {
      const result = await setDispatchWindow(write.shipmentId, write.from, write.to, input.reason);
      if (result?.moved) movedCustomers.push(nameOf(write.shipmentId));
    } catch (e: any) {
      warnings.push(`${nameOf(write.shipmentId)}'s customer window was not recorded: ${e?.message || 'try again'}`);
    }
  }

  const driverName = (runIdOf: string) => {
    const r = data.runs.find((x) => x.id === runIdOf);
    const d = data.drivers.find((x) => x.id === r?.driver_id);
    return d?.full_name || d?.email || 'another driver';
  };

  return {
    runId,
    added: plan.inserts.length,
    transferred: plan.transfers.length,
    removed: plan.removals.length,
    windowsChanged: plan.windowUpdates.length,
    blocked: plan.blocked.map((b) => `${nameOf(b.shipmentId)} (${driverName(b.runId)} is ${b.status === 'arrived' ? 'already there' : 'on the way'})`),
    movedCustomers,
    warnings,
  };
}

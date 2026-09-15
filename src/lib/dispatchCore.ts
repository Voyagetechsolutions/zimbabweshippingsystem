import { parseCollectionDate } from '@/utils/collectionDate';

// Dispatch, the parts that do not touch the database.
//
// The website's Runs screen is a port of the staff app's dispatch stack
// (DriverRunsScreen, RunDetailScreen, DispatchRouteBuilderScreen and
// CollectionGroupsScreen) onto the same tables and RPCs. A run built in either
// place is the same `driver_runs` row, so it reaches the driver the same way.
// Everything here is free of the Supabase client so it can be tested on its own.

export type RunStatus = 'planned' | 'active' | 'completed' | 'cancelled';
export type StopStatus = 'planned' | 'en_route' | 'arrived' | 'completed' | 'failed';

export type DispatchDriver = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone_number: string | null;
  driver_type: string | null;
  role: string | null;
  is_admin: boolean | null;
  on_leave: boolean | null;
  staff_active: boolean | null;
  vehicle_label: string | null;
};

export type RunRow = {
  id: string;
  driver_id: string;
  status: RunStatus;
  run_date: string;
  run_type: 'pickup' | 'delivery';
  route_name: string | null;
  vehicle_label: string | null;
  scheduled_start: string | null;
  scheduled_end: string | null;
  started_at: string | null;
  completed_at: string | null;
};

export type StopRow = {
  id: string;
  run_id: string;
  shipment_id: string;
  status: StopStatus;
  stop_order: number;
  stop_type: 'collection' | 'delivery';
  latitude: number | null;
  longitude: number | null;
  address: string | null;
};

export type BoardShipment = {
  id: string;
  tracking_number: string | null;
  customer_reference: string | null;
  status: string | null;
  collection_status: string | null;
  collection_schedule_id: string | null;
  collection_run_id?: string | null;
  pickup_latitude?: number | null;
  pickup_longitude?: number | null;
  created_at?: string | null;
  metadata: any;
};

export type ScheduleRow = { id: string; route: string; pickup_date: string | null; country?: string | null };

export const RUN_COLORS = ['#009B68', '#1d4ed8', '#ea580c', '#7c3aed', '#0891b2', '#a16207'];

// ── Dates ────────────────────────────────────────────────────────────────────

const localIso = (date: Date) =>
  new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);

/** The local calendar day `offsetDays` from `from`, as YYYY-MM-DD. */
export function isoDay(offsetDays = 0, from = new Date()): string {
  const day = new Date(from);
  day.setDate(day.getDate() + offsetDays);
  return localIso(day);
}

export function dayLabel(iso: string, now = new Date()): string {
  if (iso === isoDay(0, now)) return 'Today';
  if (iso === isoDay(1, now)) return 'Tomorrow';
  if (iso === isoDay(-1, now)) return 'Yesterday';
  return new Date(`${iso}T12:00:00`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

export function longDayLabel(iso: string): string {
  return new Date(`${iso}T12:00:00`).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
}

// ── Labels ───────────────────────────────────────────────────────────────────

export const RUN_STATUS: Record<RunStatus, { label: string; className: string }> = {
  planned: { label: 'Planned', className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200' },
  active: { label: 'On route', className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200' },
  completed: { label: 'Completed', className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200' },
  cancelled: { label: 'Cancelled', className: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-200' },
};

export const STOP_STATUS: Record<StopStatus, { label: string; className: string }> = {
  planned: { label: 'Planned', className: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200' },
  en_route: { label: 'En route', className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200' },
  arrived: { label: 'Arrived', className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200' },
  completed: { label: 'Completed', className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200' },
  failed: { label: 'Exception', className: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-200' },
};

export const runStatusOf = (status: string | null | undefined) =>
  RUN_STATUS[(status as RunStatus)] || RUN_STATUS.planned;
export const stopStatusOf = (status: string | null | undefined) =>
  STOP_STATUS[(status as StopStatus)] || STOP_STATUS.planned;

export const driverLabel = (driver?: Pick<DispatchDriver, 'full_name' | 'email'> | null) =>
  driver?.full_name?.trim() || driver?.email || 'Unknown driver';

// ── Shipments ────────────────────────────────────────────────────────────────

export const senderOf = (metadata: any) => metadata?.sender || metadata?.senderDetails || {};

export function customerName(shipment: { metadata: any } | null | undefined): string {
  const sender = senderOf(shipment?.metadata);
  return [sender.firstName, sender.lastName].filter(Boolean).join(' ').trim()
    || sender.name || 'Collection customer';
}

export function customerPhone(shipment: { metadata: any } | null | undefined): string {
  const sender = senderOf(shipment?.metadata);
  return String(sender.phone || sender.additionalPhone || shipment?.metadata?.phone || '').trim();
}

export function addressOf(shipment: { metadata: any } | null | undefined): string {
  const sender = senderOf(shipment?.metadata);
  return [sender.address, sender.city, sender.postcode || sender.postalCode].filter(Boolean).join(', ');
}

export function countryOf(shipment: { metadata: any }): 'United Kingdom' | 'Ireland' | 'Unknown' {
  const raw = String(senderOf(shipment.metadata).country || shipment.metadata?.collection?.country || '').toLowerCase();
  if (raw.includes('ireland')) return 'Ireland';
  if (raw) return 'United Kingdom';
  return 'Unknown';
}

export const routeOf = (shipment: { metadata: any }) => String(shipment.metadata?.collection?.route || '').trim();

export const shipmentReference = (shipment: Pick<BoardShipment, 'customer_reference' | 'tracking_number'> | null | undefined) =>
  shipment?.customer_reference || shipment?.tracking_number || '—';

/**
 * A phone number as the digits WhatsApp wants: country code, no plus.
 *
 * Bookings store numbers the way customers typed them, so "07123 456789" is
 * common. wa.me cannot open a national number, so a leading 0 is replaced with
 * the country code of where the collection is.
 */
export function internationalDigits(phone: string, country: string = 'United Kingdom'): string {
  const raw = String(phone || '').trim();
  const digits = raw.replace(/\D/g, '');
  if (!digits) return '';
  if (raw.startsWith('+')) return digits;
  if (digits.startsWith('00')) return digits.slice(2);
  if (digits.startsWith('0')) return `${/ireland/i.test(country) ? '353' : '44'}${digits.slice(1)}`;
  return digits;
}

export function whatsappUrl(phone: string, country?: string, text?: string): string | null {
  const digits = internationalDigits(phone, country);
  if (digits.length < 7) return null;
  return `https://wa.me/${digits}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
}

export function telUrl(phone: string): string | null {
  const value = String(phone || '').replace(/[^\d+]/g, '');
  return value.replace(/\D/g, '').length < 7 ? null : `tel:${value}`;
}

export function navigationUrl(point: { latitude: number; longitude: number }): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${point.latitude},${point.longitude}`)}&travelmode=driving`;
}

// ── The board ────────────────────────────────────────────────────────────────

export type DriverPosition = {
  driver_id: string;
  latitude: number;
  longitude: number;
  accuracy_m: number | null;
  recorded_at: string;
  status?: string | null;
};

export type PresenceRow = {
  driver_id: string;
  status: string | null;
  current_latitude: number | null;
  current_longitude: number | null;
  location_accuracy_m: number | null;
  last_location_update: string | null;
  last_seen: string | null;
};

/**
 * One position per driver, newest wins.
 *
 * Two write paths report a driver's position — the older run screens write
 * driver_live_locations, background tracking writes driver_presence — so a
 * board reading only one of them loses drivers.
 */
export function mergeDriverPositions(legacy: DriverPosition[], presence: PresenceRow[]): DriverPosition[] {
  const byDriver = new Map<string, DriverPosition>();
  const consider = (row: DriverPosition) => {
    if (!Number.isFinite(Number(row.latitude)) || !Number.isFinite(Number(row.longitude))) return;
    const existing = byDriver.get(row.driver_id);
    if (!existing || new Date(row.recorded_at).getTime() > new Date(existing.recorded_at).getTime()) {
      byDriver.set(row.driver_id, { ...row, latitude: Number(row.latitude), longitude: Number(row.longitude) });
    }
  };
  legacy.forEach(consider);
  for (const row of presence) {
    if (row.current_latitude == null || row.current_longitude == null) continue;
    consider({
      driver_id: row.driver_id,
      latitude: Number(row.current_latitude),
      longitude: Number(row.current_longitude),
      accuracy_m: row.location_accuracy_m,
      recorded_at: row.last_location_update || row.last_seen || new Date(0).toISOString(),
      status: row.status,
    });
  }
  return [...byDriver.values()];
}

export type RouteGroup = {
  route: string;
  date: string;
  shipments: BoardShipment[];
  run: RunRow | null;
  stopTotal: number;
  stopDone: number;
};

/** Route names are spelt with and without a trailing "ROUTE"; this is the join key. */
export const routeKey = (name: unknown) =>
  String(name || '').trim().toUpperCase().replace(/\s+ROUTE$/, '').trim();

const dayOf = (value: unknown): string | null => {
  const parsed = parseCollectionDate(value);
  return parsed ? localIso(parsed) : null;
};

/**
 * The day's bookings grouped by collection route, with the run working each.
 *
 * A route runs on the day its SCHEDULE says, not the day each booking stored —
 * most website bookings carry no date of their own. A booking that does name
 * this day still counts even if its schedule row has since moved on, because
 * schedule rows are edited in place when a route is re-run.
 */
export function buildRouteGroups(input: {
  date: string;
  schedules: ScheduleRow[];
  shipments: BoardShipment[];
  runs: RunRow[];
  stops: StopRow[];
}): RouteGroup[] {
  const { date, schedules, shipments, runs, stops } = input;
  const scheduleById = new Map(schedules.map((s) => [s.id, s]));
  const routesToday = schedules.filter((s) => dayOf(s.pickup_date) === date);
  const todayByKey = new Map(routesToday.map((s) => [routeKey(s.route), s]));
  const bucket = new Map<string, RouteGroup>();
  const groupFor = (route: string) => {
    const existing = bucket.get(route) || { route, date, shipments: [], run: null, stopTotal: 0, stopDone: 0 };
    bucket.set(route, existing);
    return existing;
  };

  for (const shipment of shipments) {
    const schedule = shipment.collection_schedule_id ? scheduleById.get(shipment.collection_schedule_id) : undefined;
    const rawRoute = schedule?.route || shipment.metadata?.collection?.route;
    if (!rawRoute || rawRoute === 'To be assigned') continue;
    if (String(shipment.collection_status || '') === 'Collected') continue;

    const bookedThisDay = dayOf(shipment.metadata?.collection?.date || shipment.metadata?.collectionDate) === date;
    const scheduledToday = schedule
      ? routesToday.some((s) => s.id === schedule.id)
      : todayByKey.has(routeKey(rawRoute));
    if (!scheduledToday && !bookedThisDay) continue;

    groupFor(todayByKey.get(routeKey(rawRoute))?.route || rawRoute).shipments.push(shipment);
  }

  for (const run of runs) {
    if (run.status === 'cancelled') continue;
    const route = run.route_name
      ? ([...bucket.keys()].find((name) => routeKey(name) === routeKey(run.route_name)) || run.route_name)
      : 'Assigned route';
    const group = groupFor(route);
    group.run = run;
    const runStops = stops.filter((s) => s.run_id === run.id);
    group.stopTotal = runStops.length;
    group.stopDone = runStops.filter((s) => s.status === 'completed').length;
  }

  return [...bucket.values()].sort((a, b) => a.route.localeCompare(b.route));
}

/** Twenty minutes a stop, from when the run started or was due to. */
export function estimatedFinish(run: Pick<RunRow, 'started_at' | 'scheduled_start' | 'run_date'>, remainingStops: number): Date | null {
  const base = run.started_at
    ? new Date(run.started_at)
    : run.scheduled_start ? new Date(`${run.run_date}T${run.scheduled_start}`) : null;
  if (!base || Number.isNaN(base.getTime()) || !remainingStops) return null;
  return new Date(base.getTime() + remainingStops * 20 * 60_000);
}

// ── Time windows ─────────────────────────────────────────────────────────────

/** "09:00", "9", "930" or "9.30" → minutes past midnight, or null if unusable. */
export function parseTime(value: string | null | undefined): number | null {
  const text = String(value || '').trim();
  if (!text) return null;
  const match = text.match(/^(\d{1,2})[:.]?(\d{2})?$/);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = match[2] ? Number(match[2]) : 0;
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

export function formatMinutes(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}

/** Any accepted spelling of a time as "HH:MM", or null. */
export function normaliseTime(value: string | null | undefined): string | null {
  const minutes = parseTime(value);
  return minutes == null ? null : formatMinutes(minutes);
}

/** A local wall-clock time on the run date, as the timestamptz the stop wants. */
export function windowStamp(runDate: string, value: string | null | undefined): string | null {
  const minutes = parseTime(value);
  if (minutes == null) return null;
  const [y, m, d] = runDate.split('-').map(Number);
  return new Date(y, m - 1, d, Math.floor(minutes / 60), minutes % 60, 0, 0).toISOString();
}

/** A stop's stored window back to local "HH:MM". */
export function stampToTime(stamp: string | null | undefined): string {
  if (!stamp) return '';
  const date = new Date(stamp);
  return Number.isNaN(date.getTime()) ? '' : formatMinutes(date.getHours() * 60 + date.getMinutes());
}

/**
 * Why a window cannot be saved, or null when it can.
 *
 * Half a window is refused: it would tell a driver to arrive inside a range
 * nobody agreed with the customer. The 07:00–23:00 bound is the server's own
 * rule for collection slots, checked here so it is not discovered after the
 * run has already been written.
 */
export function windowProblem(from: string, to: string): string | null {
  const hasFrom = Boolean(from.trim());
  const hasTo = Boolean(to.trim());
  if (!hasFrom && !hasTo) return null;
  if (!hasFrom || !hasTo) return 'Enter both a start and an end time, or leave both blank.';
  const start = parseTime(from);
  const end = parseTime(to);
  if (start == null || end == null) return 'Use 24-hour times such as 09:00 or 14:30.';
  if (end <= start) return 'The window must end after it starts.';
  if (start < 7 * 60 || end > 23 * 60) return 'Collection windows run between 07:00 and 23:00.';
  return null;
}

// ── Collection slots (the customer's chosen window) ─────────────────────────

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
export const hhmm = (value?: string | null) => String(value || '').slice(0, 5);

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
 * told only counts if it happened after the change it is meant to cover.
 */
export function slotState(slot?: CollectionSlot | null): SlotState {
  if (!slot?.requested_at) return 'awaiting_customer';
  if (!slot.dispatch_set_at) return 'customer_confirmed';
  if (new Date(slot.requested_at) > new Date(slot.dispatch_set_at)) return 'customer_moved';
  const moved = !slot.requested_flexible
    && (hhmm(slot.dispatch_start) !== hhmm(slot.requested_start) || hhmm(slot.dispatch_end) !== hhmm(slot.requested_end));
  if (!moved) return 'scheduled';
  const told = slot.customer_informed_at && new Date(slot.customer_informed_at) >= new Date(slot.dispatch_set_at);
  return told ? 'dispatch_moved_told' : 'dispatch_moved_untold';
}

export function requestedLabel(slot?: CollectionSlot | null): string {
  if (!slot?.requested_at) return 'No time chosen yet';
  if (slot.requested_flexible) return 'Any time — flexible';
  return windowLabel(slot.requested_start, slot.requested_end);
}

/** True when dispatch owes this customer a WhatsApp or a call. */
export const owesContact = (slot?: CollectionSlot | null) => slotState(slot) === 'dispatch_moved_untold';

/** True when a chosen window would move the customer off the time they asked for. */
export function overridesCustomer(slot: CollectionSlot | null | undefined, from: string, to: string): boolean {
  if (!slot?.requested_at || slot.requested_flexible) return false;
  if (!from.trim() && !to.trim()) return false;
  return normaliseTime(from) !== hhmm(slot.requested_start) || normaliseTime(to) !== hhmm(slot.requested_end);
}

// ── Collection groups ────────────────────────────────────────────────────────

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

export type CollectionDriver = {
  id: string;
  full_name: string | null;
  email: string | null;
  driver_type: string | null;
  on_leave: boolean;
  stops_that_day: number;
  run_route: string | null;
};

export const UNASSIGNED_ROUTE = 'Unassigned';
export const STALE_ROUTE = 'Older than 60 days';
export const isSyntheticRun = (row: CollectionRunRow) => row.run_id === null;

export function runDateLabel(date: string | null): string {
  if (!date) return 'Date not published';
  return new Date(`${date}T12:00:00`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

/** Days until the run, or null when it has no date. Negative means overdue. */
export function daysAway(date: string | null, now = new Date()): number | null {
  if (!date) return null;
  const target = new Date(`${date}T12:00:00`);
  const today = new Date(now);
  today.setHours(12, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

// ── Building and editing a run ───────────────────────────────────────────────

export type WindowPick = { from: string; to: string };

/** An open collection stop (planned, en route or arrived) on any run. */
export type OpenStop = {
  stopId: string;
  runId: string;
  shipmentId: string;
  status: StopStatus;
  windowStart: string | null;
  windowEnd: string | null;
};

export type StopPlan = {
  inserts: Array<{ shipmentId: string; stopOrder: number; start: string | null; end: string | null }>;
  transfers: Array<{ stopId: string; shipmentId: string; fromRunId: string; stopOrder: number; start: string | null; end: string | null }>;
  windowUpdates: Array<{ stopId: string; shipmentId: string; start: string | null; end: string | null }>;
  removals: Array<{ stopId: string; shipmentId: string }>;
  blocked: Array<{ shipmentId: string; runId: string; status: StopStatus }>;
  slotWrites: Array<{ shipmentId: string; from: string; to: string }>;
};

const sameInstant = (a: string | null, b: string | null) =>
  (a == null && b == null) || (a != null && b != null && new Date(a).getTime() === new Date(b).getTime());

/**
 * What saving the route builder has to do to the database.
 *
 * - A collection already on this run keeps its place; only a changed window is written.
 * - A collection sitting planned on another run (another driver, or a cancelled
 *   run) moves across. One open collection stop per booking is a database rule,
 *   so inserting a second would fail the whole save.
 * - A collection another driver has already set off for, or reached, is left
 *   where it is and reported.
 * - New stops are appended earliest window first, the same order the server
 *   uses when it assigns a whole collection group.
 * - When editing, a planned stop that was deselected comes off the run.
 * - The customer's slot is only written when the window actually changed:
 *   writing it re-stamps the change, which would re-open "customer still to be
 *   told" for someone dispatch already rang.
 */
export function planRouteStops(input: {
  runId: string | null;
  runDate: string;
  runMaxOrder: number;
  picks: Record<string, WindowPick>;
  openStops: OpenStop[];
  slots: Record<string, Pick<CollectionSlot, 'dispatch_start' | 'dispatch_end'> | undefined>;
  removeUnpicked: boolean;
}): StopPlan {
  const { runId, runDate, picks, openStops, slots, removeUnpicked } = input;
  const plan: StopPlan = { inserts: [], transfers: [], windowUpdates: [], removals: [], blocked: [], slotWrites: [] };
  const onRun = new Map(openStops.filter((s) => runId && s.runId === runId).map((s) => [s.shipmentId, s]));
  const elsewhere = new Map(openStops.filter((s) => !runId || s.runId !== runId).map((s) => [s.shipmentId, s]));

  const ids = Object.keys(picks);
  const selectionOrder = new Map(ids.map((id, index) => [id, index]));
  ids.sort((a, b) => {
    const at = parseTime(picks[a].from);
    const bt = parseTime(picks[b].from);
    if (at != null && bt != null && at !== bt) return at - bt;
    if (at != null && bt == null) return -1;
    if (at == null && bt != null) return 1;
    return (selectionOrder.get(a) ?? 0) - (selectionOrder.get(b) ?? 0);
  });

  let order = input.runMaxOrder;
  for (const shipmentId of ids) {
    const pick = picks[shipmentId];
    const complete = parseTime(pick.from) != null && parseTime(pick.to) != null;
    const start = complete ? windowStamp(runDate, pick.from) : null;
    const end = complete ? windowStamp(runDate, pick.to) : null;

    const mine = onRun.get(shipmentId);
    const other = elsewhere.get(shipmentId);
    if (mine) {
      if (!sameInstant(mine.windowStart, start) || !sameInstant(mine.windowEnd, end)) {
        plan.windowUpdates.push({ stopId: mine.stopId, shipmentId, start, end });
      }
    } else if (other && other.status !== 'planned') {
      plan.blocked.push({ shipmentId, runId: other.runId, status: other.status });
      continue;
    } else if (other) {
      order += 1;
      plan.transfers.push({ stopId: other.stopId, shipmentId, fromRunId: other.runId, stopOrder: order, start, end });
    } else {
      order += 1;
      plan.inserts.push({ shipmentId, stopOrder: order, start, end });
    }

    if (complete) {
      const from = normaliseTime(pick.from)!;
      const to = normaliseTime(pick.to)!;
      const slot = slots[shipmentId];
      if (hhmm(slot?.dispatch_start) !== from || hhmm(slot?.dispatch_end) !== to) {
        plan.slotWrites.push({ shipmentId, from, to });
      }
    }
  }

  if (removeUnpicked) {
    for (const stop of onRun.values()) {
      if (!picks[stop.shipmentId] && stop.status === 'planned') {
        plan.removals.push({ stopId: stop.stopId, shipmentId: stop.shipmentId });
      }
    }
  }
  return plan;
}

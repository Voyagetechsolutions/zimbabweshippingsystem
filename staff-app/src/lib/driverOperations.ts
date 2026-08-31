import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import { loadRouteDay, type RouteCollection } from './collections';
import { loadDeliveryDay } from './deliveries';
import { getDriverLocation, type Point } from './driverLocation';
import { isMissingBackend, isNetworkError } from './offlineQueue';

export type DriverMode = 'pickup' | 'delivery' | 'both';
export type JobStatus = 'planned' | 'claimed' | 'en_route' | 'arrived' | 'completed' | 'failed';

export type DriverJob = {
  id: string;
  shipmentId: string;
  runId?: string | null;
  kind: 'collection' | 'delivery';
  country: 'United Kingdom' | 'Ireland' | 'Zimbabwe' | string | null;
  sequence: number;
  customer: string;
  reference: string;
  phone: string;
  address: string;
  city: string;
  postcode: string;
  latitude: number | null;
  longitude: number | null;
  status: JobStatus;
  packageCount: number;
  eta: string | null;
  priority: 'normal' | 'high' | 'urgent';
  instructions: string | null;
};

export type DriverRouteOverview = {
  id: string | null;
  code: string;
  name: string;
  vehicle: string;
  status: string;
  distanceKm: number | null;
  durationMinutes: number | null;
  estimatedFinish: string | null;
  startLocation: string;
  endLocation: string;
};

export type DriverOperationsDay = {
  route: DriverRouteOverview;
  jobs: DriverJob[];
  point: Point | null;
};

const ACTIVE_ROUTE_CACHE = 'driver-active-route-cache-v1';

export async function loadCachedDriverOperationsDay(): Promise<DriverOperationsDay | null> {
  try { const raw = await AsyncStorage.getItem(ACTIVE_ROUTE_CACHE); return raw ? JSON.parse(raw) as DriverOperationsDay : null; } catch { return null; }
}

async function cacheDriverOperationsDay(day: DriverOperationsDay) {
  await AsyncStorage.setItem(ACTIVE_ROUTE_CACHE, JSON.stringify(day)).catch(() => {});
}

function metadataCount(metadata: any): number {
  const d = metadata?.shipmentDetails || metadata?.shipment || {};
  const i = metadata?.items || {};
  const values = [d.quantity, d.drums, d.drumQuantity, d.boxQuantity, i.quantity, i.drums, metadata?.quantity];
  return values.map(Number).find((v) => Number.isFinite(v) && v > 0) || 1;
}

function locationText(metadata: any, kind: 'collection' | 'delivery') {
  const p = kind === 'collection' ? (metadata?.sender || {}) : (metadata?.recipient || metadata?.recipientDetails || {});
  return {
    city: p.city || '',
    postcode: p.postcode || p.postalCode || '',
    phone: p.phone || p.additionalPhone || '',
  };
}

type AssignedStopRow = {
  id: string;
  run_id: string;
  shipment_id: string;
  stop_order: number;
  stop_type: string;
  status: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  recipient_name: string | null;
  time_window_start: string | null;
  time_window_end: string | null;
  special_instructions: string | null;
  package_count: number | null;
  priority: string | null;
  shipment: any;
};

/**
 * The stops dispatch put on this driver's run for today.
 *
 * The schedule feed answers "what is being collected on this route today"; it
 * knows nothing about a run a dispatcher assembled by hand, picking individual
 * bookings and recording the window each customer gave. Those stops are the
 * driver's actual instructions, so they are loaded separately and take
 * precedence over the schedule's version of the same booking.
 */
async function loadAssignedStops(): Promise<DriverJob[]> {
  const { data: session } = await supabase.auth.getSession();
  const driverId = session.session?.user.id;
  if (!driverId) return [];
  const today = new Date().toISOString().slice(0, 10);

  const runs = await supabase.from('driver_runs')
    .select('id').eq('driver_id', driverId).eq('run_date', today).neq('status', 'cancelled');
  if (runs.error || !runs.data?.length) return [];

  const stops = await supabase.from('driver_run_stops')
    .select('id,run_id,shipment_id,stop_order,stop_type,status,address,latitude,longitude,recipient_name,time_window_start,time_window_end,special_instructions,package_count,priority,shipment:shipments(metadata,customer_reference,tracking_number,goods_description,collection_status,pickup_latitude,pickup_longitude)')
    .in('run_id', runs.data.map((r) => r.id))
    .order('stop_order');
  if (stops.error || !stops.data) return [];

  return (stops.data as unknown as AssignedStopRow[]).map((row) => {
    const shipment = Array.isArray(row.shipment) ? row.shipment[0] : row.shipment;
    const metadata = shipment?.metadata || {};
    const sender = metadata.sender || metadata.senderDetails || {};
    const isDelivery = row.stop_type === 'delivery';
    const rawCountry = String(sender.country || metadata.collection?.country || '').toLowerCase();
    return {
      id: row.id,
      shipmentId: row.shipment_id,
      runId: row.run_id,
      kind: isDelivery ? 'delivery' : 'collection',
      country: isDelivery ? 'Zimbabwe' : rawCountry.includes('ireland') ? 'Ireland' : 'United Kingdom',
      sequence: row.stop_order,
      customer: row.recipient_name
        || [sender.firstName, sender.lastName].filter(Boolean).join(' ').trim()
        || sender.name || (isDelivery ? 'Delivery recipient' : 'Collection customer'),
      reference: shipment?.customer_reference || shipment?.tracking_number || (isDelivery ? 'Delivery' : 'Collection'),
      phone: sender.phone || sender.additionalPhone || '',
      address: row.address || [sender.address, sender.city, sender.postcode || sender.postalCode].filter(Boolean).join(', '),
      city: sender.city || '',
      postcode: sender.postcode || sender.postalCode || '',
      // A stop is created with whatever the shipment knew at the time. If the
      // address was geocoded afterwards, prefer that over an empty pin.
      latitude: row.latitude ?? shipment?.pickup_latitude ?? null,
      longitude: row.longitude ?? shipment?.pickup_longitude ?? null,
      status: (['planned', 'en_route', 'arrived', 'completed', 'failed'].includes(row.status) ? row.status : 'planned') as JobStatus,
      packageCount: Math.max(1, Number(row.package_count) || 1),
      // The window dispatch agreed with the customer is what the driver is
      // held to, so it drives the stop's ETA rather than a computed guess.
      eta: row.time_window_start,
      priority: (['normal', 'high', 'urgent'].includes(String(row.priority)) ? row.priority : 'normal') as DriverJob['priority'],
      instructions: row.special_instructions
        || (row.time_window_start ? `Customer available ${new Date(row.time_window_start).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false })}${row.time_window_end ? `–${new Date(row.time_window_end).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false })}` : ''}` : null)
        || shipment?.goods_description || null,
    } satisfies DriverJob;
  });
}

export async function loadDriverOperationsDay(mode: DriverMode): Promise<DriverOperationsDay> {
  const wantsCollections = mode !== 'delivery';
  const wantsDeliveries = mode !== 'pickup';
  // Location is useful for ordering stops, but browser permission prompts and
  // unavailable GPS hardware can wait indefinitely. Never hold the actual
  // assignment feed hostage to an optional device capability.
  const locationPromise = Promise.race([
    getDriverLocation(),
    new Promise<{ point: Point | null }>((resolve) => setTimeout(() => resolve({ point: null }), 2500)),
  ]).catch(() => ({ point: null } as { point: Point | null }));
  let networkFailure = false;
  // Assigned run stops enrich the route, but they must not prevent the live
  // collection/delivery RPC from rendering when that secondary query is slow
  // or unavailable on an older deployment.
  const assignedPromise = Promise.race([
    loadAssignedStops(),
    new Promise<DriverJob[]>((resolve) => setTimeout(() => resolve([]), 3500)),
  ]).catch((error) => { networkFailure = networkFailure || isNetworkError(error); return [] as DriverJob[]; });
  // Pickup and delivery feeds are independent. A driver who can do both must
  // still see the healthy side when one RPC is slow or unavailable.
  const collectionPromise = wantsCollections
    ? Promise.race([
      loadRouteDay(),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 8500)),
    ]).catch((error) => { networkFailure = networkFailure || isNetworkError(error); return null; })
    : Promise.resolve(null);
  const deliveryPromise = wantsDeliveries
    ? Promise.race([
      loadDeliveryDay(),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 8500)),
    ]).catch((error) => { networkFailure = networkFailure || isNetworkError(error); return null; })
    : Promise.resolve(null);
  const [collectionDay, deliveryDay, location, assigned] = await Promise.all([
    collectionPromise,
    deliveryPromise,
    locationPromise,
    assignedPromise,
  ]);

  const collectionJobs: DriverJob[] = (collectionDay?.collections || []).map((c, index) => ({
    id: c.stopId || c.shipmentId,
    shipmentId: c.shipmentId,
    runId: (c as RouteCollection & { runId?: string | null }).runId || null,
    kind: 'collection',
    country: c.country || 'United Kingdom',
    sequence: index + 1,
    customer: c.customerName || 'Collection customer',
    reference: c.customerReference || c.trackingNumber || 'Collection',
    phone: c.phone || '',
    address: [c.address, c.city, c.postcode].filter(Boolean).join(', '),
    city: c.city || '',
    postcode: c.postcode || '',
    latitude: c.latitude,
    longitude: c.longitude,
    status: c.collectionStatus === 'Collected' ? 'completed' : (c.claimStatus === 'available' ? 'planned' : c.claimStatus) as JobStatus,
    packageCount: 1,
    eta: null,
    priority: 'normal',
    instructions: c.goodsDescription,
  }));

  const deliveryJobs: DriverJob[] = (deliveryDay?.items || []).map((item, index) => ({
    id: item.stopId,
    shipmentId: item.shipmentId,
    runId: deliveryDay?.run?.id || null,
    kind: 'delivery',
    country: 'Zimbabwe',
    sequence: collectionJobs.length + index + 1,
    customer: item.receiverName || 'Delivery recipient',
    reference: item.customerReference || item.trackingNumber || 'Delivery',
    address: item.address || '',
    ...locationText({}, 'delivery'),
    phone: item.receiverPhone || '',
    latitude: item.latitude,
    longitude: item.longitude,
    status: item.stopStatus,
    packageCount: Math.max(1, Array.isArray(item.recordedSealCodes) ? item.recordedSealCodes.length : 1),
    eta: null,
    priority: 'normal',
    instructions: item.goodsDescription || item.discrepancyNote,
  }));

  // Assigned stops win: dispatch chose these bookings and agreed their times,
  // so where the schedule feed lists the same shipment it is the duplicate.
  const assignedShipmentIds = new Set(assigned.map((job) => job.shipmentId));
  const jobs = [
    ...assigned,
    ...[...collectionJobs, ...deliveryJobs].filter((job) => !assignedShipmentIds.has(job.shipmentId)),
  ].map((job, index) => ({ ...job, sequence: index + 1 }));
  if (!jobs.length && networkFailure) {
    const cached = await loadCachedDriverOperationsDay();
    if (cached) return cached;
  }
  const run = deliveryDay?.run;
  // A live RPC can return bookings while the schedule catalogue is empty.
  // Recover the route name from booking payloads before using the generic fallback.
  const scheduledRouteName = collectionDay?.routes?.length
    ? collectionDay.routes.map((r) => `${r.route}${r.country ? ` · ${r.country}` : ''}`).join('  /  ')
    : '';
  const bookingRouteName = collectionDay?.collections
    ?.map((collection) => collection.route ? `${collection.route}${collection.country ? ` · ${collection.country}` : ''}` : '')
    .filter(Boolean)
    .filter((name, index, names) => names.indexOf(name) === index)
    .join('  /  ') || '';
  const routeName = scheduledRouteName || bookingRouteName || run?.route_name || 'Today’s route';
  const result: DriverOperationsDay = {
    point: location.point,
    jobs,
    route: {
      id: run?.id || null,
      code: run?.id ? `#${run.id.slice(0, 8).toUpperCase()}` : `#${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`,
      name: routeName,
      vehicle: run?.vehicle_label || 'Vehicle not assigned',
      status: run?.status || (jobs.length ? 'ready' : 'unassigned'),
      distanceKm: null,
      durationMinutes: null,
      estimatedFinish: null,
      startLocation: mode === 'delivery' ? 'Zimbabwe depot' : 'Current location',
      endLocation: mode === 'pickup' ? 'Zimbabwe Shipping depot' : 'Final stop',
    },
  };
  if (jobs.length) await cacheDriverOperationsDay(result);
  return result;
}

export type DriverPresence = {
  status: string;
  online_since: string | null;
  last_seen: string;
  last_location_update: string | null;
};

export async function loadPresence(driverId: string): Promise<DriverPresence | null> {
  const { data } = await supabase.from('driver_presence')
    .select('status,online_since,last_seen,last_location_update')
    .eq('driver_id', driverId).maybeSingle();
  return (data as DriverPresence | null) ?? null;
}

/**
 * Publish the driver's availability to dispatch.
 *
 * Reports `unavailable` rather than throwing when the presence backend is not
 * deployed. Presence is a dispatch convenience — the attendance clock is what
 * actually records a shift — so a driver must never be blocked from going on
 * shift because this half is missing.
 */
export async function setPresence(
  online: boolean, point: Point | null, routeId?: string | null,
): Promise<'updated' | 'unavailable'> {
  const { error } = await supabase.rpc('set_driver_presence', {
    p_status: online ? 'available' : 'offline',
    p_latitude: point?.latitude ?? null,
    p_longitude: point?.longitude ?? null,
    p_accuracy_m: point?.accuracyM ?? null,
    p_active_route_id: routeId || null,
    p_current_stop_id: null,
  });
  if (error) {
    if (isMissingBackend(error)) return 'unavailable';
    throw error;
  }
  return 'updated';
}

export function navigationUrls(job: DriverJob) {
  const destination = job.latitude != null && job.longitude != null
    ? `${job.latitude},${job.longitude}` : job.address;
  const encoded = encodeURIComponent(destination);
  return Platform.select({
    ios: [
      { label: 'Apple Maps', url: `http://maps.apple.com/?daddr=${encoded}&dirflg=d` },
      { label: 'Google Maps', url: `comgooglemaps://?daddr=${encoded}&directionsmode=driving` },
      { label: 'Waze', url: `waze://?q=${encoded}&navigate=yes` },
    ],
    default: [
      { label: 'Google Maps', url: `https://www.google.com/maps/dir/?api=1&destination=${encoded}&travelmode=driving` },
      { label: 'Waze', url: `https://waze.com/ul?q=${encoded}&navigate=yes` },
    ],
  }) || [];
}

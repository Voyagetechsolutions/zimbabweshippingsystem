import { supabase } from '@/integrations/supabase/client';

// Driver operations for the website.
//
// A port of staff-app/src/lib/collections.ts and deliveries.ts onto the same
// RPCs, so a driver working from a laptop in the depot office sees exactly what
// the phone app shows. The server is the single source of truth for both — this
// file only shapes the calls and the error messages.

const db = supabase as any;

export type SealStatus = 'matched' | 'mismatch' | 'none_on_record' | 'not_entered';
export type VerificationStatus = 'pending' | 'verified' | 'rejected';
export type ClaimStatus = 'available' | 'claimed' | 'en_route' | 'arrived' | 'completed' | 'failed' | 'released';
export type StopStatus = 'planned' | 'en_route' | 'arrived' | 'completed' | 'failed';

export function isSetupMissing(error: any): boolean {
  return error?.code === 'PGRST202' || /could not find the function/i.test(error?.message || '');
}

export const SETUP_MISSING_MESSAGE =
  'This workflow has not been deployed to the database yet. Ask an admin to run the staff-ops setup.';

function rethrow(error: any): never {
  throw new Error(isSetupMissing(error) ? SETUP_MISSING_MESSAGE : (error?.message || 'Please try again.'));
}

// ── Attendance ──────────────────────────────────────────────────────────────

export type Attendance = { id: string; clocked_in_at: string; clocked_out_at: string | null };

export function todayIso(): string {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

export async function getAttendance(driverId: string): Promise<Attendance | null> {
  const { data } = await db.from('driver_attendance')
    .select('id,clocked_in_at,clocked_out_at')
    .eq('driver_id', driverId).eq('work_date', todayIso()).maybeSingle();
  return (data as Attendance) || null;
}

export async function clockDriver(action: 'in' | 'out'): Promise<Attendance> {
  const { data, error } = await db.rpc('clock_driver', { p_action: action, p_note: null });
  if (error) rethrow(error);
  return data as Attendance;
}

// ── Collections (pickup drivers) ────────────────────────────────────────────

export type RouteCollection = {
  shipmentId: string;
  trackingNumber: string | null;
  customerReference: string | null;
  customerName: string;
  phone: string | null;
  address: string | null;
  city: string;
  postcode: string;
  route: string | null;
  goodsDescription: string | null;
  collectionStatus: string | null;
  latitude: number | null;
  longitude: number | null;
  stopId: string | null;
  claimId: string | null;
  claimStatus: ClaimStatus;
  claimedBy: string | null;
  claimedByName: string | null;
  claimedAt: string | null;
  distanceKm?: number | null;
};

export type RouteDay = {
  date: string;
  routes: Array<{ scheduleId: string; route: string; country: string | null; pickupDate: string }>;
  collections: RouteCollection[];
};

export async function loadRouteDay(date?: string): Promise<RouteDay> {
  const { data, error } = await db.rpc('driver_route_collections', { p_date: date ?? null });
  if (error) rethrow(error);
  const day = data as RouteDay;
  return { date: day?.date, routes: day?.routes || [], collections: day?.collections || [] };
}

export async function claimRouteCollection(shipmentId: string): Promise<{ stopId: string }> {
  const { data, error } = await db.rpc('claim_route_collection', { p_shipment_id: shipmentId });
  if (error) rethrow(error);
  return data as { stopId: string };
}

export async function releaseRouteCollection(shipmentId: string, reason?: string): Promise<void> {
  const { error } = await db.rpc('release_route_collection', {
    p_shipment_id: shipmentId, p_reason: reason?.trim() || null,
  });
  if (error) rethrow(error);
}

/** Great-circle distance in km. Good enough to order a day's stops. */
export function distanceKm(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number },
): number {
  const R = 6371;
  const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
  const dLon = ((b.longitude - a.longitude) * Math.PI) / 180;
  const lat1 = (a.latitude * Math.PI) / 180;
  const lat2 = (b.latitude * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Nearest uncollected first. Anything without coordinates sinks to the bottom
 * rather than disappearing — the driver still has to collect it.
 */
export function sortByProximity(
  collections: RouteCollection[],
  from: { latitude: number; longitude: number } | null,
): RouteCollection[] {
  return collections
    .map((c) => ({
      ...c,
      distanceKm: from && c.latitude != null && c.longitude != null
        ? distanceKm(from, { latitude: c.latitude, longitude: c.longitude })
        : null,
    }))
    .sort((a, b) => {
      const aDone = a.collectionStatus === 'Collected' ? 1 : 0;
      const bDone = b.collectionStatus === 'Collected' ? 1 : 0;
      if (aDone !== bDone) return aDone - bDone;
      if (a.distanceKm != null && b.distanceKm != null) return a.distanceKm - b.distanceKm;
      if (a.distanceKm != null) return -1;
      if (b.distanceKm != null) return 1;
      return (a.customerName || '').localeCompare(b.customerName || '');
    });
}

/** Browser geolocation, resolved to null rather than thrown when unavailable. */
export function currentPosition(): Promise<{ latitude: number; longitude: number } | null> {
  return new Promise((resolve) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) { resolve(null); return; }
    navigator.geolocation.getCurrentPosition(
      (position) => resolve({ latitude: position.coords.latitude, longitude: position.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 120_000 },
    );
  });
}

// ── Deliveries (delivery drivers) ───────────────────────────────────────────

export type DeliveryLookup = {
  shipmentId: string;
  customerReference: string | null;
  trackingNumber: string | null;
  status: string | null;
  senderName: string;
  receiverName: string;
  receiverPhone: string;
  deliveryAddress: string;
  goodsDescription: string;
  driverCorrection: string | null;
  items: Array<{ description?: string; quantity?: number; unitPrice?: number }>;
  sealsRequested: number;
  sealsUsed: boolean;
  recordedSealCodes: string[];
  sealCondition: string | null;
  sealNotes: string | null;
  sealStatus: SealStatus;
  alreadyLoaded: boolean;
  loadedByName: string | null;
  loadedByMe: boolean;
  deliveryNote: { id: string; noteNumber: string; status: string; verificationStatus: VerificationStatus } | null;
};

export type DeliveryLoadItem = {
  stopId: string;
  stopOrder: string;
  stopStatus: StopStatus;
  shipmentId: string;
  customerReference: string | null;
  trackingNumber: string | null;
  receiverName: string;
  receiverPhone: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  goodsDescription: string;
  enteredSealCode: string | null;
  sealStatus: SealStatus;
  recordedSealCodes: string[];
  discrepancyNote: string | null;
  photoPath: string | null;
  loadedAt: string;
  noteId: string | null;
  noteNumber: string | null;
  noteStatus: string | null;
  verificationStatus: VerificationStatus;
  verificationNotes: string | null;
};

export type DeliveryRun = {
  id: string;
  status: 'planned' | 'active' | 'completed' | 'cancelled';
  run_date: string;
  run_type: 'pickup' | 'delivery';
  route_name: string | null;
  vehicle_label: string | null;
};

export type DeliveryDay = { date: string; run: DeliveryRun | null; items: DeliveryLoadItem[] };

export async function lookupDeliveryShipment(reference: string, sealCode?: string): Promise<DeliveryLookup> {
  const { data, error } = await db.rpc('lookup_delivery_shipment', {
    p_reference: reference.trim(), p_seal_code: sealCode?.trim() || null,
  });
  if (error) rethrow(error);
  const row = data as any;
  return {
    ...row,
    items: Array.isArray(row?.items) ? row.items : [],
    recordedSealCodes: Array.isArray(row?.recordedSealCodes) ? row.recordedSealCodes : [],
  } as DeliveryLookup;
}

export async function addDeliveryLoadItem(input: {
  shipmentId: string;
  enteredReference: string;
  sealCode?: string | null;
  discrepancyNote?: string | null;
  photoPath?: string | null;
}): Promise<{ stopId: string; deliveryNote: { noteNumber: string } }> {
  const { data, error } = await db.rpc('add_delivery_load_item', {
    p_shipment_id: input.shipmentId,
    p_entered_reference: input.enteredReference.trim(),
    p_seal_code: input.sealCode?.trim() || null,
    p_discrepancy_note: input.discrepancyNote?.trim() || null,
    p_photo_path: input.photoPath || null,
  });
  if (error) rethrow(error);
  return data as any;
}

export async function removeDeliveryLoadItem(stopId: string, reason?: string): Promise<void> {
  const { error } = await db.rpc('remove_delivery_load_item', {
    p_stop_id: stopId, p_reason: reason?.trim() || null,
  });
  if (error) rethrow(error);
}

export async function loadDeliveryDay(date?: string): Promise<DeliveryDay> {
  const { data, error } = await db.rpc('driver_delivery_load', { p_date: date ?? null });
  if (error) rethrow(error);
  const day = data as any;
  return {
    date: day?.date,
    run: (day?.run as DeliveryRun) || null,
    items: (Array.isArray(day?.items) ? day.items : []).map((item: any) => ({
      ...item,
      recordedSealCodes: Array.isArray(item?.recordedSealCodes) ? item.recordedSealCodes : [],
      verificationStatus: (item?.verificationStatus || 'pending') as VerificationStatus,
    })),
  };
}

// ── Shared run + stop actions ───────────────────────────────────────────────

export async function startRun(runId: string): Promise<void> {
  const { error } = await db.rpc('start_driver_run', { p_run_id: runId });
  if (error) rethrow(error);
}

export async function completeRun(runId: string): Promise<void> {
  const { error } = await db.rpc('complete_driver_run', { p_run_id: runId });
  if (error) rethrow(error);
}

export async function transitionStop(stopId: string, next: 'en_route' | 'arrived'): Promise<void> {
  const { error } = await db.rpc('transition_driver_stop', { p_stop_id: stopId, p_next_status: next });
  if (error) rethrow(error);
}

export async function failStop(stopId: string, reason: string, note?: string): Promise<void> {
  const { error } = await db.rpc('fail_driver_stop', {
    p_stop_id: stopId, p_reason: reason, p_note: note?.trim() || null,
  });
  if (error) rethrow(error);
}

// ── Labels shared by the driver and admin surfaces ──────────────────────────

export function sealStatusLabel(status: SealStatus | null | undefined): string {
  if (status === 'matched') return 'Seal matches collection record';
  if (status === 'mismatch') return 'Seal does NOT match collection record';
  if (status === 'not_entered') return 'Seal code not entered yet';
  return 'No seal recorded at collection';
}

export function verificationLabel(status: VerificationStatus): string {
  if (status === 'verified') return 'Verified by admin';
  if (status === 'rejected') return 'Rejected by admin';
  return 'Waiting for admin verification';
}

export function navigationUrl(target: { latitude?: number | null; longitude?: number | null; address?: string | null }): string {
  const destination = target.latitude != null && target.longitude != null
    ? `${target.latitude},${target.longitude}`
    : encodeURIComponent(target.address || '');
  return `https://www.google.com/maps/dir/?api=1&destination=${destination}&travelmode=driving`;
}

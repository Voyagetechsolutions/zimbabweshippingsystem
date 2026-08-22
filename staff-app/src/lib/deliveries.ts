import { supabase } from './supabase';

/**
 * The delivery driver's half of the journey.
 *
 * A pickup driver is handed a route. A delivery driver is handed a warehouse:
 * they build the load themselves by matching each consignment's customer
 * reference to the code stamped on the metal seal fitted at collection, check
 * the goods against what that reference says the customer is shipping, and only
 * then put it on the vehicle.
 *
 * Every loaded consignment raises a draft delivery note. Admin verifies each
 * one; the run cannot start, and the note cannot be downloaded, until they have.
 */

export type SealStatus = 'matched' | 'mismatch' | 'none_on_record' | 'not_entered';
export type VerificationStatus = 'pending' | 'verified' | 'rejected';

export type DeliveryLookup = {
  shipmentId: string;
  customerReference: string | null;
  trackingNumber: string | null;
  status: string | null;
  deliveryNoteStatus: string | null;
  senderName: string;
  receiverName: string;
  receiverPhone: string;
  deliveryAddress: string;
  /** What this customer declared they are shipping — the checklist for the goods. */
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
  deliveryNote: {
    id: string;
    noteNumber: string;
    status: string;
    verificationStatus: VerificationStatus;
    verificationNotes: string | null;
  } | null;
};

export type DeliveryLoadItem = {
  stopId: string;
  stopOrder: string;
  stopStatus: 'planned' | 'en_route' | 'arrived' | 'completed' | 'failed';
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
  started_at: string | null;
  completed_at: string | null;
};

export type DeliveryDay = { date: string; run: DeliveryRun | null; items: DeliveryLoadItem[] };

/** The delivery RPCs are not deployed yet on an un-migrated database. */
export function isSetupMissing(error: any): boolean {
  return error?.code === 'PGRST202' || /could not find the function/i.test(error?.message || '');
}

export const SETUP_MISSING_MESSAGE =
  'The delivery workflow has not been deployed to the database yet. Ask an admin to run the staff-ops setup.';

function rethrow(error: any): never {
  throw new Error(isSetupMissing(error) ? SETUP_MISSING_MESSAGE : (error?.message || 'Please try again.'));
}

/**
 * Find a consignment from the customer reference, and say whether the seal code
 * the driver read matches the one recorded at collection.
 *
 * The seal code is optional here on purpose: the driver types the reference
 * first so they can see what the customer is shipping, then confirms the seal.
 */
export async function lookupDeliveryShipment(reference: string, sealCode?: string): Promise<DeliveryLookup> {
  const { data, error } = await supabase.rpc('lookup_delivery_shipment', {
    p_reference: reference.trim(),
    p_seal_code: sealCode?.trim() || null,
  });
  if (error) rethrow(error);
  const row = data as any;
  return {
    ...row,
    items: Array.isArray(row?.items) ? row.items : [],
    recordedSealCodes: Array.isArray(row?.recordedSealCodes) ? row.recordedSealCodes : [],
  } as DeliveryLookup;
}

export type AddLoadResult = {
  runId: string;
  stopId: string;
  shipmentId: string;
  sealStatus: SealStatus;
  discrepancy: string | null;
  deliveryNote: { id: string; noteNumber: string; verificationStatus: VerificationStatus };
};

/**
 * Put a consignment on the vehicle.
 *
 * A seal that does not match what was recorded at collection is refused unless
 * `discrepancyNote` explains what the driver actually found — that note travels
 * with the delivery note so admin sees the discrepancy before verifying.
 */
export async function addDeliveryLoadItem(input: {
  shipmentId: string;
  enteredReference: string;
  sealCode?: string | null;
  discrepancyNote?: string | null;
  photoPath?: string | null;
}): Promise<AddLoadResult> {
  const { data, error } = await supabase.rpc('add_delivery_load_item', {
    p_shipment_id: input.shipmentId,
    p_entered_reference: input.enteredReference.trim(),
    p_seal_code: input.sealCode?.trim() || null,
    p_discrepancy_note: input.discrepancyNote?.trim() || null,
    p_photo_path: input.photoPath || null,
  });
  if (error) rethrow(error);
  return data as AddLoadResult;
}

export async function removeDeliveryLoadItem(stopId: string, reason?: string): Promise<void> {
  const { error } = await supabase.rpc('remove_delivery_load_item', {
    p_stop_id: stopId,
    p_reason: reason?.trim() || null,
  });
  if (error) rethrow(error);
}

export async function loadDeliveryDay(date?: string): Promise<DeliveryDay> {
  const { data, error } = await supabase.rpc('driver_delivery_load', { p_date: date ?? null });
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

export async function verifyDeliveryNote(noteId: string, approved: boolean, notes?: string): Promise<void> {
  const { error } = await supabase.rpc('verify_delivery_note', {
    p_note_id: noteId,
    p_approved: approved,
    p_notes: notes?.trim() || null,
  });
  if (error) rethrow(error);
}

/** Human wording for a seal comparison, used in both the driver and admin UIs. */
export function sealStatusLabel(status: SealStatus): string {
  if (status === 'matched') return 'Seal matches collection record';
  if (status === 'mismatch') return 'Seal does not match collection record';
  if (status === 'not_entered') return 'Seal code not entered yet';
  return 'No seal recorded at collection';
}

export function verificationLabel(status: VerificationStatus): string {
  if (status === 'verified') return 'Verified by admin';
  if (status === 'rejected') return 'Rejected by admin';
  return 'Waiting for admin verification';
}

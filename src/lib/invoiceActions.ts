import { supabase } from '@/integrations/supabase/client';

// Every change to a raised invoice, as one server call each.
//
// The Invoices tab used to write the whole shipments row, which row security
// only allows for is_admin accounts, so finance staff could open the tab and
// then fail on every save. These functions run on the server behind the same
// admin-or-finance check as record_invoice_payment, lock the shipment, keep the
// payments list as the one source of truth, log a shipment event and update
// the driver's copy of the invoice.

const db = supabase as any;

type StoredInvoice = Record<string, any>;

function failure(error: any, fallback: string): Error {
  const message = error?.message || fallback;
  if (/access required|permission denied|row-level security/i.test(message)) {
    return new Error('This account cannot change invoices. It needs admin or finance access.');
  }
  return new Error(message);
}

export type PaymentStatusChoice = 'paid' | 'partial' | 'unpaid';

export type PaymentDetails = {
  amount?: number;
  method?: string;
  date?: string;
  reference?: string;
  note?: string;
};

/**
 * Fully paid records the remaining balance as received; partially paid records
 * the amount given (it must leave something owing); not paid removes every
 * recorded payment, the driver's cash at collection included.
 */
export async function setInvoicePaymentStatus(shipmentId: string, status: PaymentStatusChoice, details: PaymentDetails = {}): Promise<StoredInvoice> {
  const { data, error } = await db.rpc('set_invoice_payment_status', {
    p_shipment_id: shipmentId, p_status: status, p: details,
  });
  if (error) throw failure(error, 'Could not change the payment status.');
  return data as StoredInvoice;
}

export async function verifyInvoice(shipmentId: string, verified = true, note?: string): Promise<StoredInvoice> {
  const { data, error } = await db.rpc('verify_shipment_invoice', {
    p_shipment_id: shipmentId, p_verified: verified, p_note: note?.trim() || null,
  });
  if (error) throw failure(error, 'Could not verify the invoice.');
  return data as StoredInvoice;
}

/** Edit an invoice that has already been raised. */
export async function saveRaisedInvoice(shipmentId: string, invoice: StoredInvoice): Promise<StoredInvoice> {
  const { data, error } = await db.rpc('save_shipment_invoice', { p_shipment_id: shipmentId, p_invoice: invoice });
  if (error) throw failure(error, 'Could not save the invoice.');
  return data as StoredInvoice;
}

/** Raise the invoice on a booking. The server keeps or mints the number. */
export async function raiseInvoice(shipmentId: string, invoice: StoredInvoice): Promise<StoredInvoice> {
  const { data, error } = await db.rpc('issue_shipment_invoice', { p_shipment_id: shipmentId, p_invoice: invoice });
  if (error) throw failure(error, 'Could not create the invoice.');
  return data as StoredInvoice;
}

export async function setInvoiceDeleted(shipmentId: string, deleted: boolean): Promise<StoredInvoice> {
  const { data, error } = await db.rpc('set_shipment_invoice_deleted', { p_shipment_id: shipmentId, p_deleted: deleted });
  if (error) throw failure(error, deleted ? 'Could not delete the invoice.' : 'Could not restore the invoice.');
  return data as StoredInvoice;
}

export async function removeInvoicePayment(shipmentId: string, paymentId: string): Promise<any[]> {
  const { data, error } = await db.rpc('delete_invoice_payment', { p_shipment_id: shipmentId, p_payment_id: paymentId });
  if (error) throw failure(error, 'Could not remove the payment.');
  return ((data as any)?.payments as any[]) || [];
}

export type DriverInvoiceInfo = {
  shipmentId: string;
  driverId: string | null;
  stopId: string | null;
  status: string;
  createdAt: string;
  notes: string | null;
};

/** Invoices a driver raised at a collection, keyed by shipment. */
export async function loadDriverInvoices(): Promise<Map<string, DriverInvoiceInfo>> {
  const { data, error } = await db.from('driver_invoices')
    .select('shipment_id,driver_id,stop_id,status,created_at,notes')
    .order('created_at', { ascending: false });
  if (error) throw failure(error, 'Could not load driver invoices.');
  const byShipment = new Map<string, DriverInvoiceInfo>();
  for (const row of (data as any[]) || []) {
    if (byShipment.has(row.shipment_id)) continue;
    byShipment.set(row.shipment_id, {
      shipmentId: row.shipment_id, driverId: row.driver_id, stopId: row.stop_id,
      status: row.status, createdAt: row.created_at, notes: row.notes,
    });
  }
  return byShipment;
}

export async function loadStaffNames(ids: Array<string | null | undefined>): Promise<Map<string, string>> {
  const unique = [...new Set(ids.filter((id): id is string => Boolean(id) && /^[0-9a-f-]{36}$/i.test(String(id))))];
  const names = new Map<string, string>();
  if (!unique.length) return names;
  const { data } = await db.from('profiles').select('id,full_name,email').in('id', unique);
  for (const row of (data as any[]) || []) names.set(row.id, row.full_name?.trim() || row.email || 'Staff member');
  return names;
}

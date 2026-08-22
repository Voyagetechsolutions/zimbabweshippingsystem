// Client access to the delivery note register (public.delivery_note_records).
//
// The register is what makes duplicate detection possible: before a PDF is
// written, the candidate is checked against every note already issued under the
// same invoice number or reference.

import { supabase } from '@/integrations/supabase/client';
import { itemFingerprint } from './lineItems';
import type { DeliveryNoteDraft, InvoiceExtraction, LedgerRecord, NoteFlag, NoteRow } from './types';

const TABLE = 'delivery_note_records';

// The register is newer than the checked-in generated types, so it is reached
// through an untyped handle — the same pattern the other post-generation tables
// in this app use. The row shapes above are the contract instead.
const db = supabase as unknown as {
  from: (table: string) => any;
};

/** Columns the duplicate check needs. Kept narrow so the lookup stays cheap. */
const LOOKUP_COLUMNS =
  'id,reference,invoice_number,load_suffix,shipper_name,recipient_name,recipient_city,item_fingerprint,paid,created_at';

/**
 * Every note already issued that could collide with this one. Matching on the
 * invoice number alone is not enough — a reference derived from a corrected
 * shipper name can collide with a record filed under a different invoice.
 */
export async function findLedgerMatches(
  invoiceNumber: string,
  reference: string,
): Promise<LedgerRecord[]> {
  const invoice = (invoiceNumber || '').trim();
  const ref = (reference || '').trim();
  if (!invoice && !ref) return [];

  const filters = [
    invoice ? `invoice_number.eq.${invoice}` : '',
    ref ? `reference.ilike.${ref}%` : '',
  ].filter(Boolean);

  const { data, error } = await db
    .from(TABLE)
    .select(LOOKUP_COLUMNS)
    .or(filters.join(','))
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) throw new Error(`Could not check the delivery note register: ${error.message}`);
  return (data || []) as unknown as LedgerRecord[];
}

export interface RegisterEntry extends LedgerRecord {
  recipient_phone: string | null;
  recipient_address: string | null;
  shipper_phone: string | null;
  shipper_address: string | null;
  delivery_mode: string;
  balance_due: number | null;
  unpaid_hold: boolean;
  note_date: string | null;
  pdf_filename: string | null;
  items: unknown;
  confirmed_by: string | null;
  revision: number;
  amended_at: string | null;
  amended_by: string | null;
  last_change_reason: string | null;
  voided_at: string | null;
  voided_by: string | null;
  void_reason: string | null;
}

/** The register as a browsable list, newest first. */
export async function listRegister(search = '', limit = 100, includeVoided = false): Promise<RegisterEntry[]> {
  let query = db
    .from(TABLE)
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (!includeVoided) query = query.is('voided_at', null);

  const term = search.trim();
  if (term) {
    query = query.or(
      `reference.ilike.%${term}%,invoice_number.ilike.%${term}%,recipient_name.ilike.%${term}%,shipper_name.ilike.%${term}%`,
    );
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data || []) as unknown as RegisterEntry[];
}

export interface AmendRegisterInput {
  reference: string;
  invoiceNumber: string;
  loadSuffix: string;
  shipperName: string;
  shipperPhone: string;
  shipperAddress: string;
  recipientName: string;
  recipientPhone: string;
  recipientAddress: string;
  recipientCity: string;
  deliveryMode: 'door_to_door' | 'self_collection';
  paid: boolean;
  balanceDue: number | null;
  noteDate: string;
  rows: NoteRow[];
  reason: string;
}

/** Amend an issued note. The database trigger stores the previous revision. */
export async function amendRegisterEntry(id: string, input: AmendRegisterInput): Promise<RegisterEntry> {
  const reason = input.reason.trim();
  if (!reason) throw new Error('Enter a reason for this correction.');
  if (!input.reference.trim() || !input.invoiceNumber.trim()) throw new Error('Reference and invoice number are required.');
  if (!input.shipperName.trim()) throw new Error('Shipper name is required.');
  if (!input.recipientName.trim() || !input.recipientAddress.trim() || !input.recipientCity.trim()) {
    throw new Error('Recipient name, address and city are required.');
  }
  if (!input.rows.length) throw new Error('Add at least one manifest row.');
  if (input.paid && input.balanceDue !== 0) throw new Error('A paid note must have a zero balance.');

  const payload = {
    reference: input.reference.trim().toUpperCase(),
    invoice_number: input.invoiceNumber.trim(),
    load_suffix: input.loadSuffix.trim().toUpperCase() || null,
    shipper_name: input.shipperName.trim(),
    shipper_phone: input.shipperPhone.trim() || null,
    shipper_address: input.shipperAddress.trim() || null,
    recipient_name: input.recipientName.trim(),
    recipient_phone: input.recipientPhone.trim() || null,
    recipient_address: input.recipientAddress.trim(),
    recipient_city: input.recipientCity.trim(),
    delivery_mode: input.deliveryMode,
    paid: input.paid,
    balance_due: input.balanceDue,
    unpaid_hold: input.balanceDue !== null && input.balanceDue > 0,
    note_date: input.noteDate || null,
    items: input.rows,
    item_fingerprint: itemFingerprint(input.rows),
    last_change_reason: reason,
  };

  const { data, error } = await db.from(TABLE).update(payload).eq('id', id).is('voided_at', null).select('*').single();
  if (error) throw new Error(error.message);
  return data as unknown as RegisterEntry;
}

/** Admin "Delete": void the note but retain it in duplicate history. */
export async function voidRegisterEntry(id: string, reasonValue: string): Promise<void> {
  const reason = reasonValue.trim();
  if (!reason) throw new Error('Enter a reason for deleting this delivery note.');
  const { data: session } = await supabase.auth.getUser();
  if (!session?.user?.id) throw new Error('Sign in again before deleting the note.');

  const { error } = await db.from(TABLE).update({
    voided_at: new Date().toISOString(),
    voided_by: session.user.id,
    void_reason: reason,
  }).eq('id', id).is('voided_at', null);
  if (error) throw new Error(error.message);
}

export interface RecordNoteInput {
  draft: DeliveryNoteDraft;
  extraction: InvoiceExtraction | null;
  /** Flags that were live at confirmation, with the operator's acknowledgements. */
  flags: NoteFlag[];
  acknowledged: ReadonlySet<string>;
  unpaidHold: boolean;
  pdfFilename: string;
  shipmentId?: string | null;
}

/**
 * Writes the issued note to the register. Called once the operator confirms,
 * so the next upload of the same invoice can be recognised.
 */
export async function recordIssuedNote(input: RecordNoteInput): Promise<RegisterEntry> {
  const { data: session } = await supabase.auth.getUser();
  const userId = session?.user?.id;
  if (!userId) throw new Error('Sign in again before saving the note.');

  const { draft } = input;
  const payload = {
    reference: draft.reference.trim(),
    invoice_number: draft.invoiceNumber.trim(),
    load_suffix: draft.loadSuffix.trim() || null,
    shipper_name: draft.shipper.name || null,
    shipper_phone: draft.shipper.phone || null,
    shipper_address: draft.shipper.address || null,
    recipient_name: draft.recipient.name || null,
    recipient_phone: draft.recipient.phone || null,
    recipient_address: draft.recipient.address || null,
    recipient_city: draft.recipient.city || null,
    items: draft.rows,
    item_fingerprint: itemFingerprint(draft.rows),
    delivery_mode: draft.deliveryMode,
    paid: draft.paid,
    balance_due: draft.balanceDue,
    unpaid_hold: input.unpaidHold,
    note_date: draft.date || null,
    pdf_filename: input.pdfFilename,
    source_extraction: input.extraction,
    review_flags: input.flags.map((flag) => ({
      ...flag,
      acknowledged: input.acknowledged.has(flag.id),
    })),
    shipment_id: input.shipmentId || null,
    confirmed_by: userId,
  };

  const { data, error } = await db.from(TABLE).insert(payload).select('*').single();
  if (error) {
    // The unique index on upper(reference) is the last line of defence against
    // two real loads sharing one reference; say so plainly rather than leaking
    // a constraint name.
    if (/duplicate key|unique/i.test(error.message)) {
      throw new Error(
        `Reference ${payload.reference} is already in the register. Assign a load suffix if this is a second shipment.`,
      );
    }
    throw new Error(error.message);
  }
  return data as unknown as RegisterEntry;
}

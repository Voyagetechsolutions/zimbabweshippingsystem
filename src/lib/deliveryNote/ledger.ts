// Client access to the delivery note register (public.delivery_note_records).
//
// The register is what makes duplicate detection possible: before a PDF is
// written, the candidate is checked against every note already issued under the
// same invoice number or reference.

import { supabase } from '@/integrations/supabase/client';
import { itemFingerprint } from './lineItems';
import type { DeliveryNoteDraft, InvoiceExtraction, LedgerRecord, NoteFlag } from './types';

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
  delivery_mode: string;
  balance_due: number | null;
  unpaid_hold: boolean;
  note_date: string | null;
  pdf_filename: string | null;
  items: unknown;
  confirmed_by: string | null;
}

/** The register as a browsable list, newest first. */
export async function listRegister(search = '', limit = 100): Promise<RegisterEntry[]> {
  let query = db
    .from(TABLE)
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

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

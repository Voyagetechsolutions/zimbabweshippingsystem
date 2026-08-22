// Shared shapes for the invoice -> delivery note pipeline.
//
// The pipeline has three separable stages and this file names the boundary
// between each of them:
//
//   1. EXTRACTION  a vision model transcribes the invoice into InvoiceExtraction.
//                  Raw transcription only — no business rules are applied there,
//                  so the model's output can be diffed against the printed page.
//   2. RULES       computeDeliveryNote() turns an InvoiceExtraction into a
//                  DeliveryNoteDraft plus NoteFlags. Deterministic, unit tested.
//   3. REVIEW      an operator resolves or acknowledges every flag; only then is
//                  a PDF rendered and a LedgerRecord written.

/** One priced row exactly as it is printed on the source invoice. */
export interface RawLineItem {
  /** Every line of this row's description cell, in printed order. */
  description_lines: string[];
  quantity: number | null;
  rate: number | null;
  amount: number | null;
}

/** Stage 1 output: what is printed on the invoice, and nothing more. */
export interface InvoiceExtraction {
  invoice_number: string;
  invoice_date: string;
  due_date: string;
  /** The whole Bill To block verbatim, newline separated. */
  bill_to_raw: string;
  shipper_phone_raw: string;
  /**
   * A consignee block, if the invoice printed one — most do not, and empty is
   * the expected value. Never the Bill To party, who is paying rather than
   * receiving. Prefills the recipient in review, still subject to confirmation.
   */
  deliver_to_raw: string;
  line_items: RawLineItem[];
  subtotal: number | null;
  discount: number | null;
  total: number | null;
  paid_amount: number | null;
  balance_due: number | null;
  red_paid_stamp_visible: boolean;
  /** Anything the model found ambiguous. Non-empty always routes to review. */
  extraction_confidence_notes: string;
}

/**
 * `blocking` cannot be waved through — the underlying field has to change
 * before a PDF exists (a note with no recipient is not a note).
 * `review` is a judgement call: the operator either edits the field or
 * explicitly acknowledges it, and the acknowledgement is stored on the record.
 */
export type FlagSeverity = 'blocking' | 'review';

export interface NoteFlag {
  /**
   * Stable across recomputes so an acknowledgement survives an unrelated edit.
   * Derived from the condition, never from an array index.
   */
  id: string;
  /** Draft field this flag hangs off, so the UI can highlight it in place. */
  field: string;
  severity: FlagSeverity;
  title: string;
  detail: string;
}

/** One printed row of the goods manifest. No prices, ever. */
export interface NoteRow {
  /** Short UPPERCASE label: DRUMS, BOXES, SEALS, DELIVERY... */
  item: string;
  description: string;
  /** Physical count as a string; empty on the delivery/collection row. */
  qty: string;
  /** Singular unit of the thing carried: drum, box, seal, trip. */
  uom: string;
  /**
   * How this row came about, shown in review so the operator can see where a
   * count came from without opening the invoice again.
   */
  provenance?: string;
}

export type DeliveryMode = 'door_to_door' | 'self_collection';

export interface Party {
  name: string;
  phone: string;
  /** Newline separated address lines. Never contains a phone number. */
  address: string;
  city: string;
}

/** Recipient details supplied separately from the invoice, by the office. */
export interface RecipientInput {
  name: string;
  phone: string;
  address: string;
  city: string;
}

/** Stage 2 output: everything the printed note needs. */
export interface DeliveryNoteDraft {
  reference: string;
  invoiceNumber: string;
  /** A/B/C when this invoice number carries more than one real shipment. */
  loadSuffix: string;
  date: string;
  shipper: Party;
  recipient: Party;
  rows: NoteRow[];
  deliveryMode: DeliveryMode;
  paid: boolean;
  balanceDue: number | null;
  /** Charges and artefacts deliberately left off, listed for the review pane. */
  dropped: string[];
}

/** A previously generated note, as held in the ledger. */
export interface LedgerRecord {
  id: string;
  reference: string;
  invoice_number: string;
  load_suffix: string | null;
  shipper_name: string | null;
  recipient_name: string | null;
  recipient_city: string | null;
  item_fingerprint: string | null;
  paid: boolean;
  created_at: string;
}

export type LedgerVerdict = 'clear' | 'duplicate' | 'multi_load';

export interface LedgerMatch {
  record: LedgerRecord;
  verdict: Exclude<LedgerVerdict, 'clear'>;
  reason: string;
}

export interface ComputedNote {
  draft: DeliveryNoteDraft;
  flags: NoteFlag[];
}

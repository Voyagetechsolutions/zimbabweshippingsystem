// The rules engine: an InvoiceExtraction in, a delivery-note draft plus a list
// of flags out. No model call happens here and nothing in this file is async,
// so every rule is unit testable against a fixed extraction.
//
// Two entry points, and the split matters:
//   computeDeliveryNote() builds the first draft from the invoice.
//   evaluateDraft()       re-runs every check against whatever the operator has
//                         edited, so a flag disappears when the field it is
//                         about is actually fixed rather than when it is waved
//                         through.

import { buildDeliveryRow, extractSealCodes, itemFingerprint, mapLineItems } from './lineItems';
import { classifyAgainstLedger, ledgerFlags } from './duplicates';
import { resolvePaidStatus } from './paid';
import { checkInvoiceAgainstPhone, lastFour, normalisePhone } from './phone';
import { parseBillTo, deriveReference, type BillToParse } from './reference';
import { parseRecipientText, type ParsedRecipient } from './recipient';
import type {
  DeliveryMode,
  DeliveryNoteDraft,
  InvoiceExtraction,
  LedgerRecord,
  NoteFlag,
  NoteRow,
  RecipientInput,
} from './types';

export interface ComputeContext {
  extraction: InvoiceExtraction;
  /**
   * Recipient details supplied by the office, separately from the invoice.
   * Most Tshakmo invoices do not print a consignee at all.
   */
  recipient?: RecipientInput | null;
  deliveryMode?: DeliveryMode;
  /** Previously issued notes, for duplicate and multi-load detection. */
  ledger?: LedgerRecord[];
}

/**
 * Everything evaluateDraft needs that is not on the draft itself: the original
 * invoice, the Bill To parse, and what the auto-computed values were, so an
 * operator edit can be told apart from an untouched field.
 */
/** Where the recipient on the draft came from. Drives what review asks of it. */
export type RecipientSource = 'supplied' | 'invoice' | 'none';

export interface EvaluationContext extends ComputeContext {
  billTo: BillToParse;
  autoShipperName: string;
  /** Delivery city printed on the invoice, when one was printed. */
  invoiceDeliveryCity: string;
  /** Flags derived from the raw invoice rows, which the draft cannot re-derive. */
  extractionRowFlags: NoteFlag[];
  phoneNotes: string[];
  recipientSource: RecipientSource;
  /** The consignee printed on the invoice, parsed. Null when none was printed. */
  printedRecipient: ParsedRecipient | null;
  /** The recipient name we prefilled, so an operator edit can be detected. */
  autoRecipientName: string;
}

const DELIVERY_ITEMS = new Set(['DELIVERY', 'COLLECTION']);

function normalise(text: string): string {
  return (text || '').toLowerCase().replace(/\s+/g, ' ').trim();
}

/** Reads a destination city off a printed delivery line, if the invoice had one. */
function readInvoiceDeliveryCity(extraction: InvoiceExtraction): string {
  for (const row of extraction.line_items || []) {
    const text = (row?.description_lines || []).join(' ');
    const match = text.match(/(?:delivery|deliver(?:ed)?|collection)\s+(?:to|in|at)\s+([\p{L}\s'-]{3,40})/iu);
    if (match) return match[1].trim().replace(/[,.]$/, '');
  }
  return '';
}

/** Builds the first draft. Nothing here is final — review comes next. */
export function computeDeliveryNote(context: ComputeContext): {
  draft: DeliveryNoteDraft;
  flags: NoteFlag[];
  evaluation: EvaluationContext;
} {
  const { extraction } = context;
  const billTo = parseBillTo(extraction.bill_to_raw);
  const deliveryMode: DeliveryMode = context.deliveryMode || 'door_to_door';

  // Recipient, in priority order. A receiver the office supplied separately
  // beats one printed on the invoice (§4.4); a printed one beats nothing, but
  // only as a prefill that review still has to confirm.
  const printedRecipient = extraction.deliver_to_raw?.trim()
    ? parseRecipientText(extraction.deliver_to_raw)
    : null;
  const supplied = context.recipient;
  const hasSupplied = Boolean((supplied?.name || '').trim() || (supplied?.address || '').trim());
  const recipientSource: RecipientSource = hasSupplied
    ? 'supplied'
    : printedRecipient ? 'invoice' : 'none';
  const chosenRecipient = recipientSource === 'supplied'
    ? supplied
    : recipientSource === 'invoice' ? printedRecipient : null;

  const shipperPhone = normalisePhone(extraction.shipper_phone_raw, 'UK');
  const recipientPhone = normalisePhone(chosenRecipient?.phone || '', 'ZW');
  const phoneNotes = [shipperPhone.note, recipientPhone.note].filter(Boolean) as string[];

  const mapped = mapLineItems(extraction.line_items);
  const recipientCity = (chosenRecipient?.city || '').trim();
  const rows: NoteRow[] = [...mapped.rows, buildDeliveryRow(deliveryMode, recipientCity)];

  const paidResolution = resolvePaidStatus(
    extraction.red_paid_stamp_visible === true,
    extraction.balance_due,
  );

  const draft: DeliveryNoteDraft = {
    reference: deriveReference(billTo.givenName, extraction.invoice_number),
    invoiceNumber: (extraction.invoice_number || '').trim(),
    loadSuffix: '',
    date: extraction.invoice_date || '',
    shipper: {
      name: billTo.name,
      phone: shipperPhone.value,
      address: billTo.addressLines.join('\n'),
      city: billTo.cityOnNameLine,
    },
    recipient: {
      name: (chosenRecipient?.name || '').trim(),
      phone: recipientPhone.value,
      address: (chosenRecipient?.address || '').trim(),
      city: recipientCity,
    },
    rows,
    deliveryMode,
    paid: paidResolution.paid,
    balanceDue: extraction.balance_due,
    dropped: mapped.dropped,
  };

  const evaluation: EvaluationContext = {
    ...context,
    billTo,
    autoShipperName: billTo.name,
    invoiceDeliveryCity: readInvoiceDeliveryCity(extraction),
    extractionRowFlags: mapped.flags,
    phoneNotes,
    recipientSource,
    printedRecipient,
    autoRecipientName: (chosenRecipient?.name || '').trim(),
  };

  return { draft, flags: evaluateDraft(draft, evaluation), evaluation };
}

/** Re-runs every check against the draft as it currently stands. */
export function evaluateDraft(draft: DeliveryNoteDraft, context: EvaluationContext): NoteFlag[] {
  // Keyed by id so a rule raised both from the extraction and from the draft
  // lands as one flag rather than two identical ones.
  const flags = new Map<string, NoteFlag>();
  const add = (flag: NoteFlag) => flags.set(flag.id, flag);

  // --- extraction quality -----------------------------------------------
  const notes = (context.extraction.extraction_confidence_notes || '').trim();
  if (notes) {
    add({
      id: 'extraction-notes',
      field: 'extraction',
      severity: 'review',
      title: 'The reader was unsure about something',
      detail: notes,
    });
  }

  // --- shipper name and reference ---------------------------------------
  // Editing the name is what resolves a name ambiguity; acknowledging it is the
  // operator saying the parsed name was right after all.
  const nameEdited = normalise(draft.shipper.name) !== normalise(context.autoShipperName);
  if (!nameEdited) {
    context.billTo.ambiguities.forEach((detail, index) => {
      add({
        id: `bill-to-ambiguity:${index}`,
        field: 'shipper.name',
        severity: 'review',
        title: 'Bill To needs a human read',
        detail,
      });
    });
  }

  if (!draft.reference.trim()) {
    add({
      id: 'reference-missing',
      field: 'reference',
      severity: 'blocking',
      title: 'No reference number',
      detail: 'The reference needs three letters of the shipper’s given name plus the invoice number exactly as printed.',
    });
  }
  if (!draft.invoiceNumber.trim()) {
    add({
      id: 'invoice-number-missing',
      field: 'invoiceNumber',
      severity: 'blocking',
      title: 'No invoice number',
      detail: 'The invoice number is half the reference and the key the ledger checks against. Read it off the invoice.',
    });
  }

  // --- phone sanity check -------------------------------------------------
  // Digits only, and the printed invoice number is never edited to fit.
  const phoneCheck = checkInvoiceAgainstPhone(draft.invoiceNumber, draft.shipper.phone);
  if (phoneCheck.comparable && !phoneCheck.matches) {
    add({
      id: `phone-mismatch:${phoneCheck.invoiceLastFour}:${phoneCheck.phoneLastFour}`,
      field: 'shipper.phone',
      severity: 'review',
      title: 'Phone does not match the invoice number',
      detail: `The invoice ends ${phoneCheck.invoiceLastFour} but the shipper’s phone ends ${phoneCheck.phoneLastFour}. One of the two was mistyped — check which, and leave the invoice number as printed.`,
    });
  }
  if (draft.shipper.phone.trim() && !lastFour(draft.shipper.phone)) {
    add({
      id: 'shipper-phone-short',
      field: 'shipper.phone',
      severity: 'review',
      title: 'Shipper phone looks incomplete',
      detail: `"${draft.shipper.phone}" has fewer than four digits.`,
    });
  }
  context.phoneNotes.forEach((note, index) => {
    add({
      id: `phone-normalisation:${index}`,
      field: 'shipper.phone',
      severity: 'review',
      title: 'Phone prefix was interpreted',
      detail: note,
    });
  });

  // --- recipient ----------------------------------------------------------
  // The most common reason a note cannot be finished, so it is a first-class
  // blocking state rather than an empty field that quietly prints.
  const missingRecipient = [
    !draft.recipient.name.trim() ? 'name' : '',
    !draft.recipient.address.trim() ? 'address' : '',
    !draft.recipient.city.trim() ? 'city' : '',
  ].filter(Boolean);
  if (missingRecipient.length) {
    add({
      id: 'recipient-needed',
      field: 'recipient',
      severity: 'blocking',
      title: 'Recipient needed',
      detail: `Missing the recipient’s ${missingRecipient.join(', ')}. Most invoices do not print a consignee — enter who is receiving the goods before generating.`,
    });
  }

  // A consignee lifted off the invoice is a prefill, not a confirmed fact: the
  // Bill To party is the one paying, and the two are routinely different people.
  // Editing the name counts as having looked; otherwise it needs acknowledging.
  const recipientNameEdited =
    normalise(draft.recipient.name) !== normalise(context.autoRecipientName);
  if (context.recipientSource === 'invoice' && !recipientNameEdited) {
    add({
      id: 'recipient-from-invoice',
      field: 'recipient',
      severity: 'review',
      title: 'Recipient was read off the invoice',
      detail: `"${context.autoRecipientName || 'the printed block'}" was taken from a receiver block on the invoice, not supplied by the office. Confirm this is the consignee and not the paying customer.`,
    });
  }

  // Whatever the parser could not read cleanly out of that block.
  if (context.recipientSource === 'invoice' && !recipientNameEdited) {
    (context.printedRecipient?.problems || []).forEach((problem, index) => {
      add({
        id: `printed-recipient-problem:${index}`,
        field: 'recipient',
        severity: 'review',
        title: 'Printed receiver did not parse cleanly',
        detail: problem,
      });
    });
  }

  // Both sources present and disagreeing: the supplied one wins, but silently
  // overriding what the invoice says is exactly the move to avoid.
  if (
    context.recipientSource === 'supplied' &&
    context.printedRecipient?.name &&
    normalise(context.printedRecipient.name) !== normalise(draft.recipient.name)
  ) {
    add({
      id: `recipient-conflict:${normalise(context.printedRecipient.name)}`,
      field: 'recipient',
      severity: 'review',
      title: 'Receiver differs from the one on the invoice',
      detail: `The invoice names "${context.printedRecipient.name}"; the office supplied "${draft.recipient.name}". The supplied one is being used — confirm that is right.`,
    });
  }

  if (
    context.invoiceDeliveryCity &&
    draft.recipient.city.trim() &&
    normalise(context.invoiceDeliveryCity) !== normalise(draft.recipient.city)
  ) {
    add({
      id: `city-conflict:${normalise(context.invoiceDeliveryCity)}`,
      field: 'recipient.city',
      severity: 'review',
      title: 'Destination differs from the invoice',
      detail: `The invoice says ${context.invoiceDeliveryCity}; the recipient you supplied is in ${draft.recipient.city}. The recipient wins, but confirm that is right.`,
    });
  }

  // --- rows ---------------------------------------------------------------
  const goodsRows = draft.rows.filter((row) => !DELIVERY_ITEMS.has(row.item.toUpperCase()));
  const draftKeys = new Set(draft.rows.map((row) => normalise(row.description)));

  // Carry forward the extraction-level row flags, but only while the row they
  // are about is still on the note. Anything the draft can re-derive for itself
  // (seal counts, empty manifest, duplicate rows) is left to the checks below,
  // so fixing the row is what clears the flag.
  context.extractionRowFlags.forEach((flag) => {
    const [kind, ...rest] = flag.id.split(':');
    const marker = rest.join(':');
    if (marker) {
      if (kind === 'duplicate-line') return; // recomputed from the draft rows
      if (!draftKeys.has(marker)) return;
    } else if (kind !== 'supplied-without-drum') {
      return;
    }
    add(flag);
  });

  if (!goodsRows.length) {
    add({
      id: 'no-goods-rows',
      field: 'rows',
      severity: 'blocking',
      title: 'No goods on the note',
      detail: 'A delivery note with nothing on it cannot be issued. Add the items being carried.',
    });
  }

  const counts = new Map<string, number>();
  draft.rows.forEach((row) => {
    const key = normalise(row.description);
    if (!key) return;
    counts.set(key, (counts.get(key) || 0) + 1);
  });
  counts.forEach((count, key) => {
    if (count < 2) return;
    add({
      id: `duplicate-line:${key}`,
      field: 'rows',
      severity: 'review',
      title: 'The same row appears twice',
      detail: `"${key}" is on the note ${count} times. Confirm that is two real loads and not a screenshot artefact.`,
    });
  });

  const sealRow = draft.rows.find((row) => row.item.toUpperCase() === 'SEALS');
  if (sealRow) {
    const codes = extractSealCodes(sealRow.description);
    const qty = Number(sealRow.qty);
    if (codes.length && Number.isFinite(qty) && qty > 0 && codes.length !== qty) {
      add({
        id: 'seal-count-mismatch',
        field: 'rows',
        severity: 'review',
        title: 'Seal count does not match the codes listed',
        detail: `The row says ${qty} seal(s) but ${codes.length} code(s) are listed (${codes.join(', ')}).`,
      });
    }
  }

  const lastRow = draft.rows[draft.rows.length - 1];
  if (!lastRow || !DELIVERY_ITEMS.has(lastRow.item.toUpperCase())) {
    add({
      id: 'delivery-row-missing',
      field: 'rows',
      severity: 'blocking',
      title: 'No delivery row',
      detail: 'Every note closes with a DELIVERY or COLLECTION row naming the destination.',
    });
  } else if (!draft.recipient.city.trim()) {
    // Covered by recipient-needed, but the row itself would print half-written.
    add({
      id: 'delivery-row-city',
      field: 'rows',
      severity: 'blocking',
      title: 'Delivery row has no destination',
      detail: 'The closing row names the destination city, which comes from the recipient.',
    });
  }

  // --- paid ---------------------------------------------------------------
  resolvePaidStatus(context.extraction.red_paid_stamp_visible === true, draft.balanceDue)
    .flags.forEach(add);

  if (draft.paid && typeof draft.balanceDue === 'number' && draft.balanceDue > 0) {
    add({
      id: 'stamp-contradicts-balance',
      field: 'paid',
      severity: 'blocking',
      title: 'PAID stamp with money still owing',
      detail: `The balance is ${draft.balanceDue.toFixed(2)}. A stamped note tells the consignee nothing is owed — clear the stamp or correct the balance.`,
    });
  }

  // --- ledger -------------------------------------------------------------
  const classification = classifyAgainstLedger(
    {
      reference: draft.reference,
      invoiceNumber: draft.invoiceNumber,
      recipientName: draft.recipient.name,
      recipientCity: draft.recipient.city,
      itemFingerprint: itemFingerprint(draft.rows),
    },
    context.ledger || [],
  );
  ledgerFlags(classification, draft.loadSuffix).forEach(add);

  return [...flags.values()].sort((a, b) => {
    if (a.severity === b.severity) return a.field.localeCompare(b.field);
    return a.severity === 'blocking' ? -1 : 1;
  });
}

/**
 * Whether a PDF may be generated. Blocking flags cannot be acknowledged away;
 * review flags need either the field fixed (the flag stops appearing) or an
 * explicit acknowledgement recorded against the note.
 */
export function canGenerate(flags: NoteFlag[], acknowledged: ReadonlySet<string>): boolean {
  return flags.every((flag) => flag.severity !== 'blocking' && acknowledged.has(flag.id));
}

export { itemFingerprint };

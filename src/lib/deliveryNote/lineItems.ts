// Turning priced invoice rows into a goods manifest.
//
// A delivery note is what the driver loads and the consignee signs for, so
// money comes off and physical counts go on. Every rule here is deterministic;
// where the invoice is genuinely contradictory the row is kept and a flag is
// raised rather than a winner being picked.

import type { NoteFlag, NoteRow, RawLineItem } from './types';

/** Label + singular unit for the goods we routinely carry. */
const ITEM_LABELS: Array<[RegExp, string, string]> = [
  [/\bbarrel/i, 'DRUMS', 'drum'],
  [/\bdrum/i, 'DRUMS', 'drum'],
  [/\bsuitcase|\bcase\b/i, 'SUITCASE', 'suitcase'],
  [/\btrunk/i, 'TRUNK', 'trunk'],
  [/\bbox|\bcarton/i, 'BOXES', 'box'],
  [/\bbag|\bsack/i, 'BAG', 'bag'],
  [/\btub\b/i, 'TUB', 'tub'],
  [/\bsofa|\bcouch|\blounge/i, 'SOFA', 'set'],
  [/\bchairs?\b/i, 'CHAIRS', 'chair'],
  [/\btables?\b/i, 'TABLE', 'table'],
  [/\bmirror/i, 'MIRROR', 'item'],
  [/\bbed\b|\bmattress/i, 'BED', 'item'],
  [/\bfridge|\bfreezer/i, 'FRIDGE', 'item'],
  [/\bstove|\bcooker/i, 'STOVE', 'item'],
  [/\bwashing machine|\bwasher/i, 'WASHING MACHINE', 'item'],
  [/\btv\b|\btelevision/i, 'TV', 'item'],
  [/\bwheelbarrow/i, 'WHEELBARROW', 'item'],
  [/\bgenerator/i, 'GENERATOR', 'item'],
];

/** Charges that are money, not goods. They never reach the manifest. */
const NON_GOODS: Array<[RegExp, string]> = [
  [/collection\s*fee|pick\s*-?\s*up\s*fee/i, 'collection fee'],
  [/late\s*payment|interest|surcharge|added\s*charges?|penalt/i, 'late-payment charge'],
  [/\bdiscount\b/i, 'discount'],
  [/delivery\s*(fee|charge|cost)/i, 'delivery charge'],
  [/\bdeposit\b/i, 'deposit'],
  [/storage\s*(fee|charge)/i, 'storage charge'],
  [/handling\s*(fee|charge)/i, 'handling charge'],
  [/\binsurance\b/i, 'insurance'],
];

/** "drum supplied" is the same physical drum, sold — not a second drum. */
const SUPPLIED_CONTAINER = /\b(drum|barrel)\s+supplied\b|\bsupplied\s+(drum|barrel)\b/i;
const SEAL_ROW = /\bseals?\b/i;

export interface MappedItems {
  rows: NoteRow[];
  flags: NoteFlag[];
  /** Charges and artefacts left off, for the review pane to display. */
  dropped: string[];
}

function joinLines(lines: string[]): string {
  return (lines || []).map((l) => (l || '').trim()).filter(Boolean).join(' ');
}

function classify(text: string): { item: string; uom: string } {
  const match = ITEM_LABELS.find(([re]) => re.test(text));
  return match ? { item: match[1], uom: match[2] } : { item: 'GOODS', uom: 'item' };
}

/**
 * A count written into the description ("3x boxes", "4 chairs") is the number
 * of things the driver loads. The Qty column is a billing quantity and is
 * routinely 1 for a row covering several items, so the description wins.
 */
export function countFromDescription(text: string): number | null {
  const explicit = text.match(/(\d{1,3})\s*(?:x|×|\*)\s*\p{L}/iu);
  if (explicit) return Number(explicit[1]);
  const leading = text.match(/^\s*(\d{1,3})\s+\p{L}/u);
  if (leading) return Number(leading[1]);
  const inline = text.match(
    /\b(\d{1,3})\s+(?:\p{L}+\s+){0,2}(?:boxes|drums|barrels|bags|chairs|suitcases|trunks|tubs|tables)\b/iu,
  );
  if (inline) return Number(inline[1]);
  return null;
}

/** Seal codes as printed: alphanumeric runs long enough not to be prose. */
export function extractSealCodes(text: string): string[] {
  const candidates = text.match(/[A-Za-z0-9][A-Za-z0-9-]{3,}/g) || [];
  return candidates
    .map((code) => code.trim())
    // Codes carry digits; a plain word is prose, and a bare short number is a count.
    .filter((code) => /\d/.test(code) && !/^\d{1,3}$/.test(code));
}

/**
 * Splits a row that prices several distinct physical things as one line
 * ("Dining Table and 4 chairs"). Conservative: only splits when every segment
 * names a recognisable item, otherwise the row is left whole and flagged.
 */
function splitBundle(text: string): string[] | null {
  const segments = text
    .split(/\s+and\s+|\s*\+\s*|\s*&\s*/i)
    .map((segment) => segment.trim())
    .filter(Boolean);
  if (segments.length < 2) return null;
  const allRecognised = segments.every((segment) => {
    const hasLabel = ITEM_LABELS.some(([re]) => re.test(segment));
    return hasLabel || countFromDescription(segment) !== null;
  });
  return allRecognised ? segments : null;
}

function normaliseForCompare(text: string): string {
  return text.toLowerCase().replace(/\s+/g, ' ').trim();
}

/**
 * Maps priced invoice rows onto manifest rows. The caller appends the
 * delivery/collection row afterwards — see buildDeliveryRow.
 */
export function mapLineItems(lineItems: RawLineItem[]): MappedItems {
  const rows: NoteRow[] = [];
  const flags: NoteFlag[] = [];
  const dropped: string[] = [];

  const source = Array.isArray(lineItems) ? lineItems : [];
  const texts = source.map((row) => joinLines(row?.description_lines || []));

  // A screenshot can render the same priced row twice. Neither dropping one nor
  // counting both is safe, so both are kept and the operator decides.
  const seen = new Map<string, number>();
  texts.forEach((text, index) => {
    const key = normaliseForCompare(text);
    if (!key) return;
    const firstIndex = seen.get(key);
    if (firstIndex === undefined) {
      seen.set(key, index);
      return;
    }
    flags.push({
      id: `duplicate-line:${key}`,
      field: 'rows',
      severity: 'review',
      title: 'The same line appears twice',
      detail: `"${text}" is priced on rows ${firstIndex + 1} and ${index + 1}. That is either two real loads of the same thing or a screenshot artefact — delete one row or keep both.`,
    });
  });

  const sealTexts: string[] = [];
  let sealBilledQty = 0;
  const suppliedNotes: string[] = [];

  source.forEach((raw, index) => {
    const text = texts[index];
    if (!text) return;

    const charge = NON_GOODS.find(([re]) => re.test(text));
    if (charge) {
      dropped.push(`${text} — ${charge[1]}`);
      return;
    }

    if (SUPPLIED_CONTAINER.test(text)) {
      suppliedNotes.push(text);
      return;
    }

    if (SEAL_ROW.test(text)) {
      sealTexts.push(text);
      const billed = Number(raw?.quantity);
      if (Number.isFinite(billed) && billed > 0) sealBilledQty += billed;
      return;
    }

    const rawQty = Number(raw?.quantity);
    const billedQty = Number.isFinite(rawQty) && rawQty > 0 ? rawQty : null;
    const bundle = splitBundle(text);

    if (bundle) {
      bundle.forEach((segment) => {
        const described = countFromDescription(segment);
        const { item, uom } = classify(segment);
        rows.push({
          item,
          description: segment,
          qty: String(described ?? 1),
          uom,
          provenance: `Split out of the bundled row "${text}"`,
        });
      });
      return;
    }

    const described = countFromDescription(text);
    const { item, uom } = classify(text);
    rows.push({
      item,
      description: text,
      qty: String(described ?? billedQty ?? 1),
      uom,
      provenance: described !== null && billedQty !== null && described !== billedQty
        ? `Count ${described} read from the description; the invoice billed Qty ${billedQty}`
        : undefined,
    });

    // A row that reads like several things but did not split cleanly is the
    // case most likely to under-count the load.
    if (described === null && /\s+and\s+/i.test(text) && billedQty === 1) {
      flags.push({
        id: `possible-bundle:${normaliseForCompare(text)}`,
        field: 'rows',
        severity: 'review',
        title: 'Row may cover several items',
        detail: `"${text}" is billed as one line. If it is more than one physical item, split it into a row each.`,
      });
    }
  });

  // A supplied drum folds into the drum it is: never its own row, never a count.
  if (suppliedNotes.length) {
    const drumRow = [...rows].reverse().find((row) => row.item === 'DRUMS');
    if (drumRow) {
      drumRow.description = `${drumRow.description} (drum supplied)`;
      drumRow.provenance = [drumRow.provenance, `Folded in: ${suppliedNotes.join('; ')}`]
        .filter(Boolean)
        .join('. ');
    } else {
      flags.push({
        id: 'supplied-without-drum',
        field: 'rows',
        severity: 'review',
        title: 'Supplied drum has no drum row',
        detail: `The invoice charges for "${suppliedNotes.join('; ')}" but no drum was itemised. Confirm what is actually being carried.`,
      });
      dropped.push(`${suppliedNotes.join('; ')} — supplied-container charge with no matching drum`);
    }
  }

  // Exactly one seals row per note, carrying every code.
  if (sealTexts.length) {
    const combined = sealTexts.join('; ');
    const codes = extractSealCodes(combined);
    const qty = sealBilledQty > 0 ? sealBilledQty : codes.length;

    rows.push({
      item: 'SEALS',
      description: combined,
      qty: qty > 0 ? String(qty) : '',
      uom: 'seal',
      provenance: sealTexts.length > 1 ? `Consolidated from ${sealTexts.length} seal rows` : undefined,
    });

    if (codes.length && sealBilledQty > 0 && codes.length !== sealBilledQty) {
      flags.push({
        id: 'seal-count-mismatch',
        field: 'rows',
        severity: 'review',
        title: 'Seal count does not match the codes listed',
        detail: `The invoice bills ${sealBilledQty} seal(s) but ${codes.length} code(s) are printed (${codes.join(', ')}). Set the quantity to the number of seals actually going on the load.`,
      });
    }
    if (!codes.length && !/own seal|not shown|to be|tbc/i.test(combined)) {
      flags.push({
        id: 'seal-codes-missing',
        field: 'rows',
        severity: 'review',
        title: 'Seals with no codes',
        detail: `"${combined}" lists no seal codes. Record them, or note why they are not available.`,
      });
    }
  }

  if (!rows.length) {
    flags.push({
      id: 'no-goods-rows',
      field: 'rows',
      severity: 'blocking',
      title: 'No goods on the note',
      detail: 'Every priced row was a charge or unreadable. A delivery note with no goods cannot be issued — add the items by hand.',
    });
  }

  return { rows, flags, dropped };
}

/**
 * Every note closes with this row. Door-to-door carries a trip; self-collection
 * carries nothing, so its quantity and unit are deliberately blank.
 */
export function buildDeliveryRow(mode: 'door_to_door' | 'self_collection', city: string): NoteRow {
  const destination = (city || '').trim();
  return mode === 'self_collection'
    ? { item: 'COLLECTION', description: `Self collection, ${destination}`, qty: '', uom: '-' }
    : { item: 'DELIVERY', description: `Door to door delivery, ${destination}`, qty: '', uom: 'trip' };
}

/** Stable identity of a load's goods, used to tell a duplicate from a second load. */
export function itemFingerprint(rows: NoteRow[]): string {
  return rows
    .filter((row) => row.item !== 'DELIVERY' && row.item !== 'COLLECTION')
    .map((row) => `${row.item.toLowerCase()}:${(row.qty || '').trim()}`)
    .sort()
    .join('|');
}

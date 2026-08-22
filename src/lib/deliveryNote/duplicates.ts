// Duplicate and multi-load detection against the ledger of issued notes.
//
// One invoice number covering two genuinely different shipments is normal here,
// and it is the case that misdelivers goods if it is treated as a duplicate.
// So the two are distinguished explicitly and neither resolves itself: a real
// duplicate needs a deliberate confirmation, a second load needs a suffix.

import type { LedgerMatch, LedgerRecord, NoteFlag } from './types';

export interface DuplicateCandidate {
  reference: string;
  invoiceNumber: string;
  recipientName: string;
  recipientCity: string;
  itemFingerprint: string;
}

function key(value: string): string {
  return (value || '').toLowerCase().replace(/\s+/g, ' ').trim();
}

export interface LedgerClassification {
  matches: LedgerMatch[];
  duplicates: LedgerMatch[];
  multiLoads: LedgerMatch[];
}

/**
 * Compares a candidate note against every previously issued note sharing its
 * invoice number or its computed reference.
 */
export function classifyAgainstLedger(
  candidate: DuplicateCandidate,
  ledger: LedgerRecord[],
): LedgerClassification {
  const matches: LedgerMatch[] = [];

  for (const record of ledger || []) {
    const sameInvoice = key(record.invoice_number) === key(candidate.invoiceNumber);
    const sameReference = key(record.reference) === key(candidate.reference);
    if (!sameInvoice && !sameReference) continue;

    const sameRecipient = key(record.recipient_name || '') === key(candidate.recipientName);
    const sameCity = key(record.recipient_city || '') === key(candidate.recipientCity);
    const sameItems = key(record.item_fingerprint || '') === key(candidate.itemFingerprint);

    if (sameRecipient && sameCity && sameItems) {
      matches.push({
        record,
        verdict: 'duplicate',
        reason: `${record.reference} was already issued for ${record.recipient_name || 'this recipient'} with the same items.`,
      });
      continue;
    }

    const differences = [
      !sameRecipient ? `recipient (${record.recipient_name || 'blank'} → ${candidate.recipientName || 'blank'})` : '',
      !sameCity ? `destination (${record.recipient_city || 'blank'} → ${candidate.recipientCity || 'blank'})` : '',
      !sameItems ? 'item list' : '',
    ].filter(Boolean);

    matches.push({
      record,
      verdict: 'multi_load',
      reason: `Invoice ${record.invoice_number} was already issued as ${record.reference}, but this load differs by ${differences.join(', ')}.`,
    });
  }

  return {
    matches,
    duplicates: matches.filter((m) => m.verdict === 'duplicate'),
    multiLoads: matches.filter((m) => m.verdict === 'multi_load'),
  };
}

/**
 * Turns a classification into flags. `loadSuffix` is whatever the operator has
 * assigned so far — an unsuffixed second load stays blocked, because two real
 * shipments sharing one reference in storage is the bug that misdelivers goods.
 */
export function ledgerFlags(
  classification: LedgerClassification,
  loadSuffix: string,
): NoteFlag[] {
  const flags: NoteFlag[] = [];

  for (const match of classification.duplicates) {
    flags.push({
      id: `duplicate-note:${match.record.id}`,
      field: 'reference',
      severity: 'review',
      title: 'This note has already been issued',
      detail: `${match.reason} Regenerating is for recovering a lost file — acknowledge only if that is what this is.`,
    });
  }

  if (classification.multiLoads.length && !(loadSuffix || '').trim()) {
    const taken = classification.multiLoads
      .map((m) => (m.record.load_suffix || '').trim().toUpperCase())
      .filter(Boolean);
    flags.push({
      id: 'multi-load-suffix-required',
      field: 'loadSuffix',
      severity: 'blocking',
      title: 'Second load on the same invoice number',
      detail: `${classification.multiLoads.map((m) => m.reason).join(' ')} Assign a load suffix (A/B/C) so the two shipments never share one reference.${taken.length ? ` Already used: ${taken.join(', ')}.` : ''}`,
    });
  }

  // A suffix that is already on the books would collide in storage.
  const suffix = (loadSuffix || '').trim().toUpperCase();
  if (suffix) {
    const clash = classification.matches.find(
      (m) => (m.record.load_suffix || '').trim().toUpperCase() === suffix,
    );
    if (clash) {
      flags.push({
        id: `suffix-taken:${suffix}`,
        field: 'loadSuffix',
        severity: 'blocking',
        title: `Suffix ${suffix} is already used`,
        detail: `${clash.record.reference} already carries suffix ${suffix}. Pick another letter.`,
      });
    }
  }

  return flags;
}

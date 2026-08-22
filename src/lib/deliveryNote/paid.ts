// Whether the note carries the red PAID stamp.
//
// The stamp is a claim the consignee reads at the door, so it is granted only
// on the conjunction the office actually uses: a red stamp on the invoice AND
// nothing left to pay. Everything else is a note that still prints, but prints
// unstamped and carries a hold flag through review and into the ledger.

import type { NoteFlag } from './types';

export interface PaidResolution {
  paid: boolean;
  /** True when money is still owed — surfaced in review and stored on the record. */
  unpaidHold: boolean;
  flags: NoteFlag[];
}

export function resolvePaidStatus(
  redStampVisible: boolean,
  balanceDue: number | null,
): PaidResolution {
  const flags: NoteFlag[] = [];

  if (balanceDue === null || Number.isNaN(balanceDue)) {
    flags.push({
      id: 'balance-unreadable',
      field: 'paid',
      severity: 'review',
      title: 'Balance due could not be read',
      detail: 'Without a balance the stamp cannot be decided by rule. Read it off the invoice and set the stamp by hand.',
    });
    return { paid: false, unpaidHold: true, flags };
  }

  if (balanceDue > 0) {
    flags.push({
      id: 'unpaid-hold',
      field: 'paid',
      severity: 'review',
      title: `Unpaid — ${balanceDue.toFixed(2)} still owing`,
      detail: 'The note prints without a PAID stamp and is marked as a hold. Acknowledge only if this load is going out despite the balance.',
    });
    return { paid: false, unpaidHold: true, flags };
  }

  if (balanceDue < 0) {
    // Overpayment. Still paid if stamped, but somebody is owed money back.
    flags.push({
      id: 'overpaid',
      field: 'paid',
      severity: 'review',
      title: `Overpaid by ${Math.abs(balanceDue).toFixed(2)}`,
      detail: 'The balance is negative. That is unusual enough to be worth a look before the note goes out.',
    });
    return { paid: redStampVisible, unpaidHold: !redStampVisible, flags };
  }

  // Zero balance. The stamp still has to be on the page.
  if (!redStampVisible) {
    flags.push({
      id: 'zero-balance-no-stamp',
      field: 'paid',
      severity: 'review',
      title: 'Zero balance but no PAID stamp',
      detail: 'The invoice settles to zero without a red stamp — often a discount rather than a payment. The note prints unstamped unless you say otherwise.',
    });
    return { paid: false, unpaidHold: false, flags };
  }

  return { paid: true, unpaidHold: false, flags };
}

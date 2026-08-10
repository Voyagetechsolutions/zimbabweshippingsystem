import { describe, it, expect } from 'vitest';
import {
  calculateInvoiceTotals,
  getInvoicePaymentSummary,
  isInvoiceSettled,
  getInvoiceStatusValue,
  hasStoredInvoice,
} from '@/utils/invoiceTotals';

const items = [
  { description: 'Drum', quantity: 2, unitPrice: 280 },
  { description: 'Metal seal', quantity: 1, unitPrice: 5 },
];

describe('calculateInvoiceTotals', () => {
  it('multiplies quantity by unit price across line items', () => {
    expect(calculateInvoiceTotals({ items }).subtotal).toBe(565);
  });

  it('applies a discount before tax', () => {
    const { total, tax } = calculateInvoiceTotals({ items, discount: 65, taxRate: 10 });
    expect(tax).toBeCloseTo(50, 5);   // 10% of (565 - 65)
    expect(total).toBeCloseTo(550, 5);
  });

  it('never lets a discount push the taxable amount negative', () => {
    const { total } = calculateInvoiceTotals({ items, discount: 10_000, taxRate: 20 });
    expect(total).toBe(0);
  });

  it('treats missing and non-numeric fields as zero rather than NaN', () => {
    expect(calculateInvoiceTotals({}).total).toBe(0);
    const messy = calculateInvoiceTotals({
      items: [{ quantity: undefined, unitPrice: 10 }, { quantity: 2, unitPrice: undefined }],
    });
    expect(messy.total).toBe(0);
  });
});

describe('getInvoicePaymentSummary', () => {
  it('sums partial payments and reports the balance', () => {
    const summary = getInvoicePaymentSummary({ items, payments: [{ amount: 200 }, { amount: 65 }] });
    expect(summary.paidAmount).toBe(265);
    expect(summary.balance).toBe(300);
  });

  it('clamps overpayment to a zero balance rather than going negative', () => {
    expect(getInvoicePaymentSummary({ items, payments: [{ amount: 900 }] }).balance).toBe(0);
  });
});

describe('isInvoiceSettled', () => {
  it('is settled once payments cover the total', () => {
    expect(isInvoiceSettled({ items, payments: [{ amount: 565 }] })).toBe(true);
  });

  it('tolerates sub-penny rounding left by percentage tax', () => {
    expect(isInvoiceSettled({ items, payments: [{ amount: 564.999 }] })).toBe(true);
  });

  it('honours the legacy paid flag when there are no payment entries', () => {
    // Regression: the customer dashboard originally judged settlement on
    // balance alone, so an older invoice marked paid — but with no itemised
    // payments — was shown to the customer as still outstanding.
    expect(isInvoiceSettled({ items, paid: true, payments: [] })).toBe(true);
    expect(isInvoiceSettled({ items, paid: false, payments: [] })).toBe(false);
  });

  it('does not treat the paid flag as settlement once real payments exist', () => {
    // A part-paid invoice with a stale paid flag is still outstanding.
    expect(isInvoiceSettled({ items, paid: true, payments: [{ amount: 100 }] })).toBe(false);
  });

  it('is not settled when there is nothing to pay', () => {
    expect(isInvoiceSettled({ items: [], payments: [] })).toBe(false);
  });
});

describe('hasStoredInvoice', () => {
  // Regression: getInvoiceData synthesises a draft for any shipment without a
  // stored invoice, so the admin tab counted all 192 bookings as invoices and
  // reported ~£49k "outstanding" plus ~£44k "overdue" that had never been
  // billed. Totals, chasing and sending must all gate on this.
  it('is false when the shipment carries no invoice at all', () => {
    expect(hasStoredInvoice({ metadata: {} })).toBe(false);
    expect(hasStoredInvoice({ metadata: { pricing: { finalAmount: 560 } } })).toBe(false);
  });

  it('is false for a shipment with no metadata, null, or undefined', () => {
    expect(hasStoredInvoice({})).toBe(false);
    expect(hasStoredInvoice(null)).toBe(false);
    expect(hasStoredInvoice(undefined)).toBe(false);
  });

  it('is false for a stored invoice with nothing to bill for', () => {
    expect(hasStoredInvoice({ metadata: { invoice: {} } })).toBe(false);
    expect(hasStoredInvoice({ metadata: { invoice: { items: [] } } })).toBe(false);
  });

  it('is true once the invoice has line items', () => {
    expect(hasStoredInvoice({ metadata: { invoice: { items } } })).toBe(true);
  });
});

describe('getInvoiceStatusValue', () => {
  it('reports paid, partial and draft', () => {
    expect(getInvoiceStatusValue({ items, payments: [{ amount: 565 }] })).toBe('paid');
    expect(getInvoiceStatusValue({ items, payments: [{ amount: 100 }] })).toBe('partial');
    expect(getInvoiceStatusValue({ items, payments: [] })).toBe('draft');
  });

  it('reports sent once it has been sent', () => {
    expect(getInvoiceStatusValue({ items, payments: [] }, true)).toBe('sent');
  });

  it('reports overdue past the due date, ahead of sent', () => {
    expect(getInvoiceStatusValue({ items, payments: [], dueDate: '2020-01-01' }, true)).toBe('overdue');
  });

  it('does not call a fully paid invoice overdue', () => {
    expect(getInvoiceStatusValue({ items, payments: [{ amount: 565 }], dueDate: '2020-01-01' })).toBe('paid');
  });
});

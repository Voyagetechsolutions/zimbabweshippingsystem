/**
 * Invoice arithmetic for the app, mirroring `src/utils/invoiceTotals.ts` and the
 * admin's `BillingInvoiceTemplate` exactly.
 *
 * This exists because the app had grown its own third copy of the maths and it
 * disagreed with the office on two counts, so a customer's invoice did not match
 * the one the admin had issued them:
 *
 *   1. The app subtracted `invoice.discount` and added `invoice.taxRate`. The
 *      admin's invoice template deliberately does neither — it renders
 *      `{ ...invoice, discount: 0, taxRate: 0 }`, so the total the office issues
 *      is the plain sum of the line items. Any booking carrying a referral or
 *      returning-resident discount therefore showed the customer a smaller total
 *      than the invoice they were actually sent.
 *   2. The app read `paid` as `Boolean(invoice.paid)` alone, ignoring recorded
 *      payments, so an invoice settled through `payments[]` still read
 *      "Payment due" in the app while the office showed it paid.
 *
 * The office's version is the authority. Everything here follows it, and any
 * future change belongs in `src/utils/invoiceTotals.ts` first.
 */

export type InvoiceLineItem = { description?: string; quantity?: number; unitPrice?: number };
export type PaymentEntry = { amount?: number; date?: string; method?: string; reference?: string };
export type InvoiceLike = {
  invoiceNumber?: string;
  issueDate?: string;
  dueDate?: string;
  items?: InvoiceLineItem[];
  discount?: number;
  taxRate?: number;
  payments?: PaymentEntry[];
  paid?: boolean;
  currency?: string;
  paymentTerms?: string;
  notes?: string;
};

/**
 * The invoice as the office issues it.
 *
 * Discount and tax are zeroed to match `BillingInvoiceTemplate`. They are still
 * carried on the record — bookings write a referral discount there — but the
 * document the customer is billed from does not apply them, so neither may we.
 */
export function asIssued(invoice?: InvoiceLike | null): InvoiceLike {
  return { ...(invoice || {}), discount: 0, taxRate: 0 };
}

export function calculateInvoiceTotals(invoice: InvoiceLike) {
  const subtotal = (invoice.items || []).reduce(
    (sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0),
    0,
  );
  const discount = Number(invoice.discount) || 0;
  const taxable = Math.max(0, subtotal - discount);
  const tax = taxable * ((Number(invoice.taxRate) || 0) / 100);
  return { subtotal, discount, tax, total: taxable + tax };
}

/** Sum of recorded offline payments and the remaining balance. */
export function getInvoicePaymentSummary(invoice: InvoiceLike) {
  const { total } = calculateInvoiceTotals(invoice);
  const paidAmount = (invoice.payments || []).reduce((sum, payment) => sum + (Number(payment.amount) || 0), 0);
  return { total, paidAmount, balance: Math.max(0, total - paidAmount) };
}

/**
 * Whether an invoice reads as settled.
 *
 * The `paid` flag is honoured for legacy invoices that predate itemised payment
 * entries — without it, an invoice marked paid but carrying no payment rows
 * shows as outstanding to the customer.
 */
export function isInvoiceSettled(invoice: InvoiceLike): boolean {
  const { total, paidAmount, balance } = getInvoicePaymentSummary(invoice);
  return (total > 0 && balance <= 0.005) || (Boolean(invoice.paid) && paidAmount === 0);
}

/** Everything a screen or a PDF needs, computed the way the office computes it. */
export function issuedInvoiceView(invoice?: InvoiceLike | null) {
  const issued = asIssued(invoice);
  const { subtotal, total } = calculateInvoiceTotals(issued);
  const { paidAmount, balance } = getInvoicePaymentSummary(issued);
  return {
    issued,
    items: issued.items || [],
    currency: issued.currency || 'GBP',
    subtotal,
    total,
    paidAmount,
    balance,
    settled: isInvoiceSettled(issued),
    partial: paidAmount > 0 && !isInvoiceSettled(issued),
  };
}

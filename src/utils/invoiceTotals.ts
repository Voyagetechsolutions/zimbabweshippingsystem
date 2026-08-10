/**
 * Invoice arithmetic, in one place.
 *
 * Invoices live on `shipment.metadata.invoice` and are read by the admin
 * invoices tab, the customer web dashboard and the customer mobile app. Totals
 * are always recomputed from the line items rather than read from a stored
 * total, because editing an invoice would otherwise leave a stale figure behind.
 *
 * This was extracted from BillingInvoiceGenerator once a second copy appeared in
 * the customer dashboard — the copy silently dropped the legacy `paid` rule
 * below and showed settled invoices as unpaid.
 */

export interface InvoiceLineItemLike {
  description?: string;
  quantity?: number;
  unitPrice?: number;
}

export interface PaymentEntryLike {
  amount?: number;
}

export interface InvoiceLike {
  items?: InvoiceLineItemLike[];
  discount?: number;
  taxRate?: number;
  payments?: PaymentEntryLike[];
  paid?: boolean;
  dueDate?: string;
}

export type InvoiceStatusValue = 'draft' | 'sent' | 'partial' | 'paid' | 'overdue';

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

export function getInvoiceStatusValue(invoice: InvoiceLike, hasBeenSent = false): InvoiceStatusValue {
  const { paidAmount } = getInvoicePaymentSummary(invoice);
  if (isInvoiceSettled(invoice)) return 'paid';
  if (paidAmount > 0) return 'partial';
  const overdue = Boolean(invoice.dueDate) && new Date(invoice.dueDate as string) < new Date(new Date().toDateString());
  if (overdue) return 'overdue';
  return hasBeenSent ? 'sent' : 'draft';
}

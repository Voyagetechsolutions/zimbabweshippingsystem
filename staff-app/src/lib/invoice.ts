// Invoice logic ported 1:1 from the website's BillingInvoiceGenerator so the
// mobile app computes totals and lifecycle status identically. Invoices are
// stored offline on shipment.metadata.invoice (Invoice2go-style).
import type { Shipment } from './shipment';

export type InvoiceStatus = 'draft' | 'sent' | 'partial' | 'paid' | 'overdue';

export interface InvoiceLineItem { item?: string; description?: string; quantity?: number; unitPrice?: number; }
export interface PaymentEntry { amount?: number; method?: string; date?: string; }
export interface InvoiceData {
  invoiceNumber?: string;
  issueDate?: string;
  dueDate?: string;
  items?: InvoiceLineItem[];
  discount?: number;
  taxRate?: number;
  currency?: string;
  payments?: PaymentEntry[];
  paid?: boolean;
  sentAt?: string;
  publishedToCustomerAt?: string | null;
  paymentTerms?: string;
  notes?: string;
  deletedAt?: string | null;
}

export function hasInvoice(s: Shipment): boolean {
  return !!(s?.metadata && (s.metadata as any).invoice);
}

export function getInvoice(s: Shipment): InvoiceData {
  return (((s?.metadata as any) || {}).invoice || {}) as InvoiceData;
}

/**
 * Has anybody actually raised this invoice?
 *
 * The booking prices a shipment the moment it is made — those line items are
 * what the driver's goods list, the delivery note and the reporting views all
 * read, so they have to be there from the start. What they are *not* is an
 * invoice; an invoice is a document a member of staff decides to issue after
 * the confirmation call, once the contents and the price are known to be right.
 *
 * The invoice number is what separates the two. Nothing else assigns one, and
 * every invoice raised before this distinction existed already carries one, so
 * no invoice already with a customer changes meaning.
 */
export function isIssued(inv: InvoiceData | null | undefined): boolean {
  if (!inv || inv.deletedAt) return false;
  return String(inv.invoiceNumber ?? '').trim().length > 0;
}

/** The shipment has an invoice a customer could be shown. */
export function hasIssuedInvoice(s: Shipment): boolean {
  return isIssued(getInvoice(s));
}

/**
 * Rebuild the priced lines from the booking itself.
 *
 * Website bookings write no `metadata.invoice` at all — `SimplifiedBookingForm`
 * inserts straight into `shipments` and records what was ordered under
 * `metadata.items` and `metadata.purchasedDrums` instead. Without this, "Create
 * invoice" on a website booking opened empty and the button sat disabled
 * telling staff to go and add the items by hand, which is exactly the typing
 * the prefill exists to avoid.
 *
 * Only what the customer actually ordered becomes a line. Nothing is invented,
 * and a booking that genuinely priced nothing still yields nothing.
 */
function linesFromBooking(metadata: any): InvoiceLineItem[] {
  const lines: InvoiceLineItem[] = [];
  const items = metadata?.items || {};
  const add = (description: string, quantity: number, unitPrice: number) => {
    if (!(quantity > 0) || !(unitPrice > 0)) return;
    lines.push({ item: description, description, quantity, unitPrice });
  };

  if (items.drums?.quantity) {
    add('Shipping drum (200-220L)', Number(items.drums.quantity), Number(items.drums.pricePerDrum));
  }
  if (items.trunks?.quantity) {
    add('Trunk / storage box', Number(items.trunks.quantity), Number(items.trunks.pricePerTrunk));
  }
  for (const line of Array.isArray(items.otherItems) ? items.otherItems : []) {
    add(
      String(line.description || 'Other item'),
      Number(line.quantity ?? 1),
      Number(line.unitPrice ?? line.price ?? 0),
    );
  }

  const addOns = items.addOns || {};
  if (addOns.metalSeal && Number(addOns.metalSealQuantity) > 0) {
    add('Metal coded seal', Number(addOns.metalSealQuantity), Number(addOns.metalSealPrice));
  }
  if (addOns.doorToDoor && Number(addOns.doorToDoorAddressCount) > 0) {
    const count = Number(addOns.doorToDoorAddressCount);
    const totalPrice = Number(addOns.doorToDoorPrice) || 0;
    add(
      `Zimbabwe door delivery (${count} address${count > 1 ? 'es' : ''})`,
      count,
      count > 0 ? totalPrice / count : 0,
    );
  }

  const purchased = metadata?.purchasedDrums;
  if (purchased && Number(purchased.quantity) > 0) {
    add(
      purchased.type === 'metal' ? 'Metal drum purchased from us' : 'Plastic barrel purchased from us',
      Number(purchased.quantity),
      Number(purchased.priceEach),
    );
  }

  // The pay-on-arrival premium is money the customer agreed to at booking, so
  // it belongs on the invoice as its own line. Taken from what was recorded
  // rather than recalculated: a booking quoted before the rate changed must be
  // invoiced at the rate it was quoted at, not today's.
  const premium = Number(metadata?.pricing?.payOnArrivalPremium) || 0;
  if (premium > 0) add('Pay on arrival premium', 1, premium);

  return lines;
}

/**
 * The lines a new invoice should start from.
 *
 * Everything the booking priced, so "Create invoice" opens filled in rather
 * than blank. Staff correct it there; nothing is charged that nobody checked.
 */
export function invoicePrefill(s: Shipment): InvoiceData {
  const existing = getInvoice(s);
  const metadata = ((s?.metadata as any) || {});
  const currency = existing.currency
    || metadata.pricing?.currency
    || (String(metadata.sender?.country || '').toLowerCase().includes('ireland') ? 'EUR' : 'GBP');

  // Whatever the booking already itemised wins; a website booking has nothing
  // there and is rebuilt from what was ordered.
  const existingItems = Array.isArray(existing.items) ? existing.items : [];
  const items = existingItems.length ? existingItems : linesFromBooking(metadata);

  return {
    ...existing,
    currency,
    items,
    discount: Number(existing.discount) || 0,
    taxRate: Number(existing.taxRate) || 0,
    payments: Array.isArray(existing.payments) ? existing.payments : [],
    paymentTerms: existing.paymentTerms
      || metadata.pricing?.paymentTermsSummary
      || metadata.pricing?.paymentMethod
      || '',
  };
}

/** How many lines "Create invoice" would start with, booking included. */
export function prefillLineCount(s: Shipment): number {
  return invoicePrefill(s).items?.length || 0;
}

export function calculateTotals(inv: InvoiceData) {
  const items = inv.items || [];
  const subtotal = items.reduce((sum, it) => sum + (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0), 0);
  const discount = Number(inv.discount) || 0;
  const taxable = Math.max(0, subtotal - discount);
  const tax = taxable * ((Number(inv.taxRate) || 0) / 100);
  const total = taxable + tax;
  return { subtotal, discount, tax, total };
}

// Sum of recorded offline payments and the remaining balance.
export function getPaymentSummary(inv: InvoiceData) {
  const { total } = calculateTotals(inv);
  const paidAmount = (inv.payments || []).reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const balance = Math.max(0, total - paidAmount);
  return { total, paidAmount, balance };
}

// Invoice2go-style lifecycle status, derived from payments + due date.
export function getInvoiceStatus(inv: InvoiceData): InvoiceStatus {
  const { total, paidAmount, balance } = getPaymentSummary(inv);
  if ((total > 0 && balance <= 0.005) || (inv.paid && paidAmount === 0)) return 'paid';
  if (paidAmount > 0) return 'partial';
  const overdue = !!inv.dueDate && new Date(inv.dueDate) < new Date(new Date().toDateString());
  if (overdue) return 'overdue';
  if (inv.sentAt) return 'sent';
  return 'draft';
}

export function invoiceSymbol(currency?: string): string {
  if (currency === 'EUR') return '€';
  if (currency === 'GBP' || !currency) return '£';
  return currency + ' ';
}

export const INVOICE_STATUS_STYLE: Record<InvoiceStatus, { bg: string; fg: string; label: string }> = {
  paid: { bg: '#d1fae5', fg: '#047857', label: 'Paid' },
  partial: { bg: '#dbeafe', fg: '#1d4ed8', label: 'Partial' },
  overdue: { bg: '#fee2e2', fg: '#b91c1c', label: 'Overdue' },
  sent: { bg: '#fef3c7', fg: '#b45309', label: 'Sent' },
  draft: { bg: '#f1f5f9', fg: '#475569', label: 'Draft' },
};

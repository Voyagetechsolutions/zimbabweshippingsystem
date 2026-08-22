// Invoice logic ported 1:1 from the website's BillingInvoiceGenerator so the
// mobile app computes totals and lifecycle status identically. Invoices are
// stored offline on shipment.metadata.invoice (Invoice2go-style).
import type { Shipment } from './shipment';

export type InvoiceStatus = 'draft' | 'sent' | 'partial' | 'paid' | 'overdue';

export interface InvoiceLineItem { description?: string; quantity?: number; unitPrice?: number; }
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
}

export function hasInvoice(s: Shipment): boolean {
  return !!(s?.metadata && (s.metadata as any).invoice);
}

export function getInvoice(s: Shipment): InvoiceData {
  return (((s?.metadata as any) || {}).invoice || {}) as InvoiceData;
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

import React, { useRef, useState } from 'react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Download, Loader2, Printer } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Shipment } from '@/types/shipment';
import { buildRefNumber } from '@/components/admin/DeliveryNoteGenerator';

export interface InvoiceLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
}

// A single offline payment recorded against an invoice (bank transfer, cash, etc.).
// Supports partial payments — several entries can add up to the invoice total.
export interface PaymentEntry {
  id: string;
  date: string;        // yyyy-MM-dd
  amount: number;
  method: string;      // 'cash' | 'bank_transfer' | 'card' | 'cheque' | 'other'
  reference?: string;  // bank ref, receipt #, etc.
  note?: string;
}

export interface InvoiceData {
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  items: InvoiceLineItem[];
  discount: number;
  taxRate: number;
  paymentTerms: string;
  notes: string;
  currency: string;
  paid: boolean;             // kept for backwards-compat; derived from balance on save
  payments: PaymentEntry[];  // offline payments recorded against this invoice
  sentAt: string | null;     // ISO timestamp when the invoice was marked as sent
}

export type InvoiceStatus = 'draft' | 'sent' | 'partial' | 'paid' | 'overdue';

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: 'Cash',
  bank_transfer: 'Bank Transfer',
  card: 'Card',
  cheque: 'Cheque',
  other: 'Other',
};

const CURRENCY_SYMBOL: Record<string, string> = { EUR: '€', GBP: '£', USD: '$' };

function getSenderName(s: Shipment) {
  const m = s.metadata || {};
  return m.sender?.name || m.senderDetails?.name ||
    (m.sender?.firstName ? `${m.sender.firstName} ${m.sender.lastName || ''}`.trim() : '') ||
    (m.senderDetails?.firstName ? `${m.senderDetails.firstName} ${m.senderDetails.lastName || ''}`.trim() : '') ||
    'Unknown Customer';
}

function getSenderEmail(s: Shipment) {
  const m = s.metadata || {};
  return m.sender?.email || m.senderDetails?.email || '';
}

function getSenderPhone(s: Shipment) {
  const m = s.metadata || {};
  return m.sender?.phone || m.senderDetails?.phone || '';
}

function getSenderAddress(s: Shipment): string[] {
  const m = s.metadata || {};
  const src = m.sender || m.senderDetails || {};
  const parts: string[] = [];
  if (src.address) parts.push(src.address);
  if (src.city) parts.push(src.city);
  if (src.country) parts.push(src.country);
  return parts.length ? parts : [s.origin || ''];
}

function getRecipientName(s: Shipment) {
  const m = s.metadata || {};
  return m.recipient?.name || m.recipientDetails?.name ||
    (m.recipient?.firstName ? `${m.recipient.firstName} ${m.recipient.lastName || ''}`.trim() : '') ||
    'Unknown Recipient';
}

export function inferCurrency(s: Shipment): string {
  const m = (s.metadata as Record<string, unknown> | undefined) || {};
  const pricing = (m.pricing as { currency?: string } | undefined) || {};
  if (pricing.currency) return pricing.currency;
  const country = (m.sender as { country?: string } | undefined)?.country
    || (m.senderDetails as { country?: string } | undefined)?.country;
  if (country === 'Ireland' || country === 'Northern Ireland') return 'EUR';
  if (country === 'England' || country === 'Wales' || country === 'Scotland' || country === 'UK' || country === 'United Kingdom') return 'GBP';
  return 'EUR';
}

export function buildDefaultInvoice(s: Shipment): InvoiceData {
  const m = (s.metadata as Record<string, unknown> | undefined) || {};
  const ship = ((m.shipment as Record<string, unknown> | undefined) || (m.shipmentDetails as Record<string, unknown> | undefined) || {}) as Record<string, unknown>;
  const itemsMeta = (m.items as Record<string, unknown> | undefined) || {};
  const pricing = (m.pricing as { baseAmount?: number; finalAmount?: number; paymentMethod?: string; currency?: string } | undefined) || {};

  const items: InvoiceLineItem[] = [];

  const drumQty = Number(ship.drums ?? ship.drumQuantity ?? 0);
  const drums = (itemsMeta.drums as { pricePerDrum?: number; quantity?: number } | undefined) || {};
  if (drumQty > 0) {
    items.push({
      description: ship.drumsDescription ? `Drum (200–220L) — ${ship.drumsDescription}` : 'Drum (200–220L)',
      quantity: drumQty,
      unitPrice: Number(drums.pricePerDrum ?? 0),
    });
  }

  const trunkQty = Number(ship.boxes ?? ship.trunkQuantity ?? 0);
  const trunks = (itemsMeta.trunks as { pricePerTrunk?: number; quantity?: number } | undefined) || {};
  if (trunkQty > 0) {
    items.push({
      description: ship.trunksDescription ? `Trunk / Storage Box — ${ship.trunksDescription}` : 'Trunk / Storage Box',
      quantity: trunkQty,
      unitPrice: Number(trunks.pricePerTrunk ?? 0),
    });
  }

  const addOns = (itemsMeta.addOns as { metalSeal?: boolean; metalSealPrice?: number } | undefined) || {};
  if (ship.wantMetalSeal || ship.metalSeal || addOns.metalSeal) {
    const sealQty = drumQty + trunkQty;
    if (sealQty > 0) {
      items.push({
        description: 'Metal Coded Seal',
        quantity: sealQty,
        unitPrice: Number(addOns.metalSealPrice ?? 0),
      });
    }
  }

  const otherDesc = ship.boxesDescription || ship.category || ship.description;
  if (ship.includeOtherItems || ship.includeBoxes || otherDesc) {
    items.push({
      description: `Other Items: ${otherDesc || 'agent quote'}`,
      quantity: 1,
      unitPrice: 0,
    });
  }

  if (items.length === 0) {
    items.push({ description: 'Shipping service', quantity: 1, unitPrice: Number(pricing.finalAmount ?? 0) });
  }

  const issueDate = format(new Date(s.created_at), 'yyyy-MM-dd');
  const due = new Date(s.created_at);
  due.setDate(due.getDate() + 14);
  const dueDate = format(due, 'yyyy-MM-dd');

  const refTail = (s.tracking_number || '').replace(/[^0-9A-Z]/gi, '').slice(-6) || 'XXXXXX';

  return {
    invoiceNumber: `INV-${refTail}`,
    issueDate,
    dueDate,
    items,
    discount: 0,
    taxRate: 0,
    paymentTerms: pricing.paymentMethod === 'cashOnCollection'
      ? 'Cash on collection'
      : pricing.paymentMethod === 'payOnArrival'
        ? 'Pay on arrival in Zimbabwe'
        : 'Payment due within 14 days of invoice date.',
    notes: '',
    currency: pricing.currency || inferCurrency(s),
    paid: false,
    payments: [],
    sentAt: null,
  };
}

export function getInvoiceData(s: Shipment): InvoiceData {
  const stored = (s.metadata as Record<string, unknown> | undefined)?.invoice as Partial<InvoiceData> | undefined;
  const defaults = buildDefaultInvoice(s);
  if (!stored) return defaults;
  const payments = Array.isArray(stored.payments) ? (stored.payments as PaymentEntry[]) : defaults.payments;
  return {
    invoiceNumber: stored.invoiceNumber || defaults.invoiceNumber,
    issueDate: stored.issueDate || defaults.issueDate,
    dueDate: stored.dueDate || defaults.dueDate,
    items: Array.isArray(stored.items) && stored.items.length ? stored.items : defaults.items,
    discount: Number(stored.discount ?? defaults.discount),
    taxRate: Number(stored.taxRate ?? defaults.taxRate),
    paymentTerms: stored.paymentTerms ?? defaults.paymentTerms,
    notes: stored.notes ?? defaults.notes,
    currency: stored.currency || defaults.currency,
    paid: Boolean(stored.paid),
    payments,
    sentAt: stored.sentAt ?? defaults.sentAt,
  };
}

export function calculateTotals(invoice: InvoiceData) {
  const subtotal = invoice.items.reduce((sum, it) => sum + (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0), 0);
  const discount = Number(invoice.discount) || 0;
  const taxable = Math.max(0, subtotal - discount);
  const tax = taxable * ((Number(invoice.taxRate) || 0) / 100);
  const total = taxable + tax;
  return { subtotal, discount, tax, total };
}

// Sum of recorded offline payments and the remaining balance.
export function getPaymentSummary(invoice: InvoiceData) {
  const { total } = calculateTotals(invoice);
  const paidAmount = (invoice.payments || []).reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const balance = Math.max(0, total - paidAmount);
  return { total, paidAmount, balance };
}

// Invoice2go-style lifecycle status, derived from payments + due date.
export function getInvoiceStatus(invoice: InvoiceData): InvoiceStatus {
  const { total, paidAmount, balance } = getPaymentSummary(invoice);
  // Treat an explicit "paid" flag as fully paid for legacy invoices with no payment entries.
  if ((total > 0 && balance <= 0.005) || (invoice.paid && paidAmount === 0)) return 'paid';
  if (paidAmount > 0) return 'partial';
  const overdue = !!invoice.dueDate && new Date(invoice.dueDate) < new Date(new Date().toDateString());
  if (overdue) return 'overdue';
  if (invoice.sentAt) return 'sent';
  return 'draft';
}

function fmtMoney(amount: number, currency: string) {
  const sym = CURRENCY_SYMBOL[currency] || currency + ' ';
  return `${sym}${(Number(amount) || 0).toFixed(2)}`;
}

export const BillingInvoiceTemplate = React.forwardRef<HTMLDivElement, { shipment: Shipment; invoice: InvoiceData }>(
  ({ shipment, invoice }, ref) => {
    const totals = calculateTotals(invoice);
    const { paidAmount, balance } = getPaymentSummary(invoice);
    const status = getInvoiceStatus(invoice);
    const customerName = getSenderName(shipment);
    const customerEmail = getSenderEmail(shipment);
    const customerPhone = getSenderPhone(shipment);
    const customerAddress = getSenderAddress(shipment);
    const recipientName = getRecipientName(shipment);

    return (
      <div
        ref={ref}
        style={{
          fontFamily: 'Arial, Helvetica, sans-serif',
          fontSize: '13px',
          color: '#111',
          backgroundColor: '#fff',
          padding: '40px 48px',
          width: '794px',
          minHeight: '600px',
          boxSizing: 'border-box',
          position: 'relative',
        }}
      >
        {status === 'paid' && (
          <div style={{
            position: 'absolute', top: '120px', right: '60px', transform: 'rotate(-12deg)',
            border: '4px solid #16a34a', color: '#16a34a', padding: '6px 18px',
            fontSize: '32px', fontWeight: 'bold', letterSpacing: '2px', opacity: 0.8,
          }}>PAID</div>
        )}
        {status === 'partial' && (
          <div style={{
            position: 'absolute', top: '120px', right: '60px', transform: 'rotate(-12deg)',
            border: '4px solid #d97706', color: '#d97706', padding: '6px 18px',
            fontSize: '28px', fontWeight: 'bold', letterSpacing: '2px', opacity: 0.8,
          }}>PART PAID</div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
          <img src="/logo.png" alt="Zimbabwe Shipping" crossOrigin="anonymous" style={{ height: '80px', width: 'auto' }} />
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '32px', fontWeight: 'bold', letterSpacing: '1px' }}>INVOICE</div>
            <div style={{ fontSize: '12px', color: '#444', lineHeight: '1.6', marginTop: '8px' }}>
              <div>Invoice #: <strong style={{ fontSize: '15px', color: '#111' }}>{invoice.invoiceNumber}</strong></div>
              <div>Issue Date: <strong>{invoice.issueDate}</strong></div>
              <div>Due Date: <strong>{invoice.dueDate}</strong></div>
            </div>
          </div>
        </div>

        <div style={{ borderTop: '2px solid #111', marginBottom: '24px' }} />

        <div style={{ display: 'flex', gap: '40px', marginBottom: '28px' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 'bold', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#666', marginBottom: '6px' }}>FROM</div>
            <div style={{ fontWeight: 600 }}>Zimbabwe Shipping</div>
            <div style={{ color: '#444', lineHeight: '1.6' }}>www.zimbabweshipping.ie</div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 'bold', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#666', marginBottom: '6px' }}>BILL TO</div>
            <div style={{ fontWeight: 600 }}>{customerName}</div>
            {customerEmail && <div style={{ color: '#444' }}>{customerEmail}</div>}
            {customerPhone && <div style={{ color: '#444' }}>{customerPhone}</div>}
            {customerAddress.map((line, i) => (
              <div key={i} style={{ color: '#444' }}>{line}</div>
            ))}
          </div>
        </div>

        <div style={{ background: '#f1f5f9', padding: '10px 14px', fontSize: '12px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', borderRadius: '4px' }}>
          <span><strong>Tracking:</strong> {shipment.tracking_number}</span>
          <span><strong>Recipient:</strong> {recipientName}</span>
          <span><strong>Route:</strong> {shipment.origin} → {shipment.destination}</span>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', marginBottom: '12px' }}>
          <thead>
            <tr style={{ backgroundColor: '#2563eb', color: '#fff' }}>
              <th style={{ padding: '10px 12px', textAlign: 'left', width: '40px' }}>#</th>
              <th style={{ padding: '10px 12px', textAlign: 'left' }}>Description</th>
              <th style={{ padding: '10px 12px', textAlign: 'right', width: '60px' }}>Qty</th>
              <th style={{ padding: '10px 12px', textAlign: 'right', width: '110px' }}>Unit Price</th>
              <th style={{ padding: '10px 12px', textAlign: 'right', width: '110px' }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((it, i) => (
              <tr key={i} style={{ backgroundColor: i % 2 === 0 ? '#f8fafc' : '#fff', borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '10px 12px' }}>{i + 1}</td>
                <td style={{ padding: '10px 12px' }}>{it.description}</td>
                <td style={{ padding: '10px 12px', textAlign: 'right' }}>{it.quantity}</td>
                <td style={{ padding: '10px 12px', textAlign: 'right' }}>{fmtMoney(it.unitPrice, invoice.currency)}</td>
                <td style={{ padding: '10px 12px', textAlign: 'right' }}>{fmtMoney((Number(it.quantity) || 0) * (Number(it.unitPrice) || 0), invoice.currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '24px' }}>
          <table style={{ fontSize: '13px' }}>
            <tbody>
              <tr><td style={{ padding: '4px 16px', textAlign: 'right' }}>Subtotal</td><td style={{ padding: '4px 0', textAlign: 'right', minWidth: '110px' }}>{fmtMoney(totals.subtotal, invoice.currency)}</td></tr>
              {totals.discount > 0 && (
                <tr><td style={{ padding: '4px 16px', textAlign: 'right', color: '#dc2626' }}>Discount</td><td style={{ padding: '4px 0', textAlign: 'right', color: '#dc2626' }}>− {fmtMoney(totals.discount, invoice.currency)}</td></tr>
              )}
              {invoice.taxRate > 0 && (
                <tr><td style={{ padding: '4px 16px', textAlign: 'right' }}>Tax ({invoice.taxRate}%)</td><td style={{ padding: '4px 0', textAlign: 'right' }}>{fmtMoney(totals.tax, invoice.currency)}</td></tr>
              )}
              <tr style={{ borderTop: '2px solid #111', fontWeight: 'bold', fontSize: '15px' }}>
                <td style={{ padding: '8px 16px', textAlign: 'right' }}>Total</td>
                <td style={{ padding: '8px 0', textAlign: 'right' }}>{fmtMoney(totals.total, invoice.currency)}</td>
              </tr>
              {paidAmount > 0 && (
                <tr style={{ color: '#16a34a' }}>
                  <td style={{ padding: '4px 16px', textAlign: 'right' }}>Amount Paid</td>
                  <td style={{ padding: '4px 0', textAlign: 'right' }}>− {fmtMoney(paidAmount, invoice.currency)}</td>
                </tr>
              )}
              {paidAmount > 0 && (
                <tr style={{ fontWeight: 'bold', fontSize: '15px', color: balance <= 0.005 ? '#16a34a' : '#b91c1c' }}>
                  <td style={{ padding: '8px 16px', textAlign: 'right' }}>Balance Due</td>
                  <td style={{ padding: '8px 0', textAlign: 'right' }}>{fmtMoney(balance, invoice.currency)}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {invoice.payments && invoice.payments.length > 0 && (
          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontWeight: 'bold', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#666', marginBottom: '6px' }}>Payments Received</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', color: '#333' }}>
              <tbody>
                {invoice.payments.map((p) => (
                  <tr key={p.id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '4px 8px' }}>{p.date}</td>
                    <td style={{ padding: '4px 8px' }}>{PAYMENT_METHOD_LABELS[p.method] || p.method}</td>
                    <td style={{ padding: '4px 8px', color: '#666' }}>{p.reference || ''}</td>
                    <td style={{ padding: '4px 8px', textAlign: 'right' }}>{fmtMoney(Number(p.amount) || 0, invoice.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {invoice.paymentTerms && (
          <div style={{ marginBottom: '12px' }}>
            <div style={{ fontWeight: 'bold', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#666', marginBottom: '4px' }}>Payment Terms</div>
            <div style={{ color: '#333', lineHeight: '1.6' }}>{invoice.paymentTerms}</div>
          </div>
        )}

        {invoice.notes && (
          <div style={{ marginBottom: '12px' }}>
            <div style={{ fontWeight: 'bold', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#666', marginBottom: '4px' }}>Notes</div>
            <div style={{ color: '#333', lineHeight: '1.6', whiteSpace: 'pre-line' }}>{invoice.notes}</div>
          </div>
        )}

        <div style={{ marginTop: '32px', borderTop: '1px solid #ddd', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#888' }}>
          <span>Ref: {buildRefNumber(shipment)}</span>
          <span>Generated: {format(new Date(), 'dd/MM/yyyy HH:mm')}</span>
        </div>
      </div>
    );
  }
);
BillingInvoiceTemplate.displayName = 'BillingInvoiceTemplate';

interface BillingInvoiceGeneratorProps {
  isOpen: boolean;
  onClose: () => void;
  shipment: Shipment;
  invoice: InvoiceData;
}

const BillingInvoiceGenerator: React.FC<BillingInvoiceGeneratorProps> = ({ isOpen, onClose, shipment, invoice }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const filename = `${invoice.invoiceNumber || buildRefNumber(shipment)}.pdf`;

  const handleDownload = async () => {
    setIsGenerating(true);
    try {
      const html2canvas = (await import('html2canvas')).default;
      const { jsPDF } = await import('jspdf');
      if (!ref.current) throw new Error('Element not found');
      const canvas = await html2canvas(ref.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff', logging: false });
      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      const pdf = new jsPDF('p', 'mm', 'a4');
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, imgWidth, imgHeight);
      pdf.save(filename);
      toast({ title: 'Downloaded', description: `${filename} saved.` });
    } catch (err) {
      console.error(err);
      toast({ title: 'Error', description: 'Could not generate PDF.', variant: 'destructive' });
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePrint = () => {
    if (!ref.current) return;
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`
      <html><head><title>${invoice.invoiceNumber}</title>
      <style>body{margin:0;padding:0;}@media print{body{margin:0;}}</style>
      </head><body>${ref.current.outerHTML}</body></html>
    `);
    win.document.close();
    win.focus();
    win.print();
    win.close();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Invoice — {invoice.invoiceNumber}</DialogTitle>
          <DialogDescription>
            Customer invoice for {shipment.tracking_number}.
          </DialogDescription>
        </DialogHeader>

        <div className="border rounded-lg overflow-auto bg-white">
          <BillingInvoiceTemplate ref={ref} shipment={shipment} invoice={invoice} />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" onClick={onClose}>Close</Button>
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" /> Print
          </Button>
          <Button onClick={handleDownload} disabled={isGenerating} className="bg-green-600 hover:bg-green-700">
            {isGenerating
              ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Generating…</>
              : <><Download className="h-4 w-4 mr-2" />Download PDF</>
            }
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BillingInvoiceGenerator;

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { BadgeCheck, Eye, Loader2, Pencil, ShieldAlert, Truck, Wallet } from 'lucide-react';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import type { Shipment } from '@/types/shipment';
import { PAYMENT_METHOD_LABELS, getInvoiceData, getPaymentSummary } from '@/components/admin/BillingInvoiceGenerator';
import { getInvoicePaymentState } from '@/utils/invoiceTotals';
import { verifyInvoice, type DriverInvoiceInfo } from '@/lib/invoiceActions';
import PaymentStamp from './PaymentStamp';

// Checking an invoice a driver raised at the door.
//
// Drivers price and confirm the invoice with the customer and often take money
// there and then. The office checks that against what it knows — the lines,
// the prices, what was paid and how — and verifies it, or corrects it first.

const SYMBOL: Record<string, string> = { EUR: '€', GBP: '£', USD: '$' };
const money = (amount: number, currency: string) => `${SYMBOL[currency] || `${currency} `}${(Number(amount) || 0).toFixed(2)}`;
const when = (value?: string | null) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : format(date, 'd MMM yyyy, HH:mm');
};

export default function DriverInvoiceReviewDialog({ shipment, driverInvoice, names, open, onOpenChange, onVerified, onEdit, onMarkAs, onView }: {
  shipment: Shipment | null;
  driverInvoice: DriverInvoiceInfo | null;
  names: Map<string, string>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onVerified: (shipmentId: string, invoice: Record<string, any>) => void;
  onEdit: (shipment: Shipment) => void;
  onMarkAs: (shipment: Shipment) => void;
  onView: (shipment: Shipment) => void;
}) {
  const { toast } = useToast();
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (open) setNote(''); }, [open, shipment?.id]);

  if (!shipment) return null;

  const invoice = getInvoiceData(shipment);
  const stored = ((shipment.metadata as Record<string, any> | undefined)?.invoice || {}) as Record<string, any>;
  const sender = (shipment.metadata as Record<string, any> | undefined)?.sender || {};
  const customer = sender.name || [sender.firstName, sender.lastName].filter(Boolean).join(' ') || 'Customer';
  const { total, paidAmount, balance } = getPaymentSummary(invoice);
  const verified = Boolean(stored.verifiedAt);
  const driverId = driverInvoice?.driverId || stored.driverConfirmedBy;
  const driverName = (driverId && names.get(driverId)) || 'Driver';
  const driverPayments = (invoice.payments || []).filter((p: any) => p.recordedBy === 'driver');

  const setVerified = async (value: boolean) => {
    setBusy(true);
    try {
      const updated = await verifyInvoice(shipment.id, value, note);
      onVerified(shipment.id, updated);
      toast({ title: value ? 'Invoice verified' : 'Verification removed', description: invoice.invoiceNumber });
      if (value) onOpenChange(false);
    } catch (e: any) {
      toast({ title: 'Could not update verification', description: e?.message, variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!busy) onOpenChange(next); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Truck className="h-5 w-5 text-blue-700" /> Driver invoice</DialogTitle>
          <DialogDescription>
            <span className="font-mono">{invoice.invoiceNumber}</span> · {customer} · <span className="font-mono">{shipment.tracking_number}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          <div className="grid gap-2 rounded-md border p-3 sm:grid-cols-2">
            <div><span className="text-muted-foreground">Raised by</span> <strong>{driverName}</strong></div>
            <div><span className="text-muted-foreground">Raised</span> {when(driverInvoice?.createdAt) || when(stored.issueDate) || '—'}</div>
            <div><span className="text-muted-foreground">Confirmed with customer</span> {when(stored.driverConfirmedAt) || 'Not confirmed'}</div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Office check</span>
              {verified ? (
                <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
                  <BadgeCheck className="h-4 w-4" />
                  Verified{stored.verifiedBy && names.get(stored.verifiedBy) ? ` by ${names.get(stored.verifiedBy)}` : ''}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 font-semibold text-amber-700"><ShieldAlert className="h-4 w-4" /> Waiting</span>
              )}
            </div>
            {verified ? <div className="sm:col-span-2 text-xs text-muted-foreground">{when(stored.verifiedAt)}{stored.verificationNote ? ` · ${stored.verificationNote}` : ''}</div> : null}
            {driverInvoice?.notes ? <div className="sm:col-span-2"><span className="text-muted-foreground">Driver notes</span> {driverInvoice.notes}</div> : null}
          </div>

          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs text-muted-foreground">
                <tr><th className="px-3 py-2 text-left">Line</th><th className="px-3 py-2 text-right">Qty</th><th className="px-3 py-2 text-right">Price</th><th className="px-3 py-2 text-right">Amount</th></tr>
              </thead>
              <tbody className="divide-y">
                {invoice.items.map((item, index) => (
                  <tr key={index}>
                    <td className="px-3 py-2">{item.description || item.item || 'Item'}</td>
                    <td className="px-3 py-2 text-right">{item.quantity}</td>
                    <td className="px-3 py-2 text-right">{money(item.unitPrice, invoice.currency)}</td>
                    <td className="px-3 py-2 text-right">{money((Number(item.quantity) || 0) * (Number(item.unitPrice) || 0), invoice.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between rounded-md border bg-muted/40 px-3 py-2">
            <div className="space-y-0.5">
              <div>Total <strong>{money(total, invoice.currency)}</strong></div>
              <div className="text-emerald-700">Paid <strong>{money(paidAmount, invoice.currency)}</strong>
                {driverPayments.length ? (
                  <span className="text-xs text-muted-foreground"> · {money(driverPayments.reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0), invoice.currency)} taken by the driver ({driverPayments.map((p: any) => PAYMENT_METHOD_LABELS[p.method] || p.method).join(', ')})</span>
                ) : null}
              </div>
              <div>Balance <strong>{money(balance, invoice.currency)}</strong></div>
            </div>
            <PaymentStamp state={getInvoicePaymentState(invoice)} className="text-xs" />
          </div>

          <div className="space-y-1">
            <Label htmlFor="verify-note" className="text-xs">Note for the record (optional)</Label>
            <Input id="verify-note" value={note} placeholder="e.g. Cash counted at the depot" onChange={(e) => setNote(e.target.value)} />
          </div>
        </div>

        <DialogFooter className="flex-wrap gap-2 sm:justify-between">
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => onView(shipment)}><Eye className="mr-1.5 h-4 w-4" />View invoice</Button>
            <Button variant="outline" size="sm" onClick={() => onEdit(shipment)}><Pencil className="mr-1.5 h-4 w-4" />Edit</Button>
            <Button variant="outline" size="sm" onClick={() => onMarkAs(shipment)}><Wallet className="mr-1.5 h-4 w-4" />Payment status</Button>
          </div>
          {verified ? (
            <Button variant="outline" size="sm" disabled={busy} onClick={() => void setVerified(false)}>
              {busy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}Remove verification
            </Button>
          ) : (
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" disabled={busy} onClick={() => void setVerified(true)}>
              {busy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <BadgeCheck className="mr-1.5 h-4 w-4" />}Verify invoice
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

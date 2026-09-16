import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { AlertTriangle, Loader2, Trash2, Truck } from 'lucide-react';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { Shipment } from '@/types/shipment';
import { PAYMENT_METHOD_LABELS, getInvoiceData, getPaymentSummary } from '@/components/admin/BillingInvoiceGenerator';
import { getInvoicePaymentState } from '@/utils/invoiceTotals';
import { removeInvoicePayment, setInvoicePaymentStatus, type PaymentStatusChoice } from '@/lib/invoiceActions';
import PaymentStamp from './PaymentStamp';

// Mark an invoice fully paid, partially paid or not paid.
//
// Payment state is always what the recorded payments add up to, so each choice
// changes the payments rather than a flag that could disagree with them:
// fully paid records the balance as received, partially paid records the
// amount given, and not paid clears what was recorded.

const SYMBOL: Record<string, string> = { EUR: '€', GBP: '£', USD: '$' };
const money = (amount: number, currency: string) => `${SYMBOL[currency] || `${currency} `}${(Number(amount) || 0).toFixed(2)}`;

const CHOICES: Array<{ value: PaymentStatusChoice; label: string }> = [
  { value: 'paid', label: 'Fully paid' },
  { value: 'partial', label: 'Partially paid' },
  { value: 'unpaid', label: 'Not paid' },
];

export default function InvoicePaymentDialog({ shipment, initialMode, open, onOpenChange, onSaved }: {
  shipment: Shipment | null;
  initialMode: PaymentStatusChoice;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: (shipmentId: string, invoice: Record<string, any>) => void;
}) {
  const { toast } = useToast();
  const [mode, setMode] = useState<PaymentStatusChoice>(initialMode);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('bank_transfer');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [reference, setReference] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setMode(initialMode);
    setAmount('');
    setMethod('bank_transfer');
    setDate(format(new Date(), 'yyyy-MM-dd'));
    setReference('');
    setNote('');
    setConfirmRemove(null);
  }, [open, initialMode, shipment?.id]);

  if (!shipment) return null;

  const invoice = getInvoiceData(shipment);
  const stored = ((shipment.metadata as Record<string, any> | undefined)?.invoice || {}) as Record<string, any>;
  const { total, paidAmount, balance } = getPaymentSummary(invoice);
  const state = getInvoicePaymentState(invoice);
  const payments = invoice.payments || [];
  const partAmount = Number(amount);
  const partProblem = mode !== 'partial'
    ? null
    : total <= 0
      ? 'This invoice has no total to part-pay.'
      : !(partAmount > 0)
        ? 'Enter the amount received.'
        : partAmount >= balance - 0.005
          ? `That clears the ${money(balance, invoice.currency)} balance — choose Fully paid instead.`
          : null;

  const save = async () => {
    if (partProblem) {
      toast({ title: 'Check the amount', description: partProblem, variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const updated = await setInvoicePaymentStatus(shipment.id, mode, {
        amount: mode === 'partial' ? partAmount : undefined,
        method, date, reference, note,
      });
      onSaved(shipment.id, updated);
      toast({
        title: mode === 'paid' ? 'Marked fully paid' : mode === 'partial' ? 'Part payment recorded' : 'Marked not paid',
        description: mode === 'partial'
          ? `${invoice.invoiceNumber}: ${money(balance - partAmount, invoice.currency)} still owing.`
          : invoice.invoiceNumber,
      });
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: 'Payment status not changed', description: e?.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const remove = async (paymentId: string) => {
    setRemoving(paymentId);
    try {
      const next = await removeInvoicePayment(shipment.id, paymentId);
      onSaved(shipment.id, { ...stored, payments: next });
      setConfirmRemove(null);
      toast({ title: 'Payment removed', description: invoice.invoiceNumber });
    } catch (e: any) {
      toast({ title: 'Could not remove the payment', description: e?.message, variant: 'destructive' });
    } finally {
      setRemoving(null);
    }
  };

  const showDetails = mode === 'partial' || (mode === 'paid' && balance > 0.005);

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!saving) onOpenChange(next); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Payment status</DialogTitle>
          <DialogDescription>
            Invoice <span className="font-mono">{invoice.invoiceNumber}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-md border bg-muted/40 px-3 py-2 text-sm">
            <div className="space-y-0.5">
              <div>Total <span className="font-semibold">{money(total, invoice.currency)}</span></div>
              <div className="text-emerald-700">Paid <span className="font-semibold">{money(paidAmount, invoice.currency)}</span></div>
              <div>Balance <span className="font-semibold">{money(balance, invoice.currency)}</span></div>
            </div>
            <PaymentStamp state={state} className="text-xs" />
          </div>

          <div className="grid grid-cols-3 gap-1 rounded-md border p-1" role="radiogroup" aria-label="Payment status">
            {CHOICES.map((choice) => (
              <button
                key={choice.value}
                type="button"
                role="radio"
                aria-checked={mode === choice.value}
                onClick={() => setMode(choice.value)}
                className={cn(
                  'rounded px-2 py-1.5 text-xs font-semibold transition-colors',
                  mode === choice.value
                    ? choice.value === 'paid' ? 'bg-emerald-600 text-white'
                      : choice.value === 'partial' ? 'bg-amber-500 text-white' : 'bg-red-600 text-white'
                    : 'text-muted-foreground hover:bg-muted',
                )}
              >
                {choice.label}
              </button>
            ))}
          </div>

          {mode === 'paid' ? (
            <p className="text-sm text-muted-foreground">
              {balance > 0.005
                ? <>Records <strong className="text-foreground">{money(balance, invoice.currency)}</strong> received — the remaining balance — and stamps the invoice PAID.</>
                : 'The recorded payments already cover the total. This confirms it as paid.'}
            </p>
          ) : null}

          {mode === 'unpaid' ? (
            payments.length ? (
              <p className="flex gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950/30 dark:text-red-200">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  Removes all {payments.length} recorded payment{payments.length === 1 ? '' : 's'} ({money(paidAmount, invoice.currency)})
                  {payments.some((p: any) => p.recordedBy === 'driver') ? ', including money the driver recorded at collection' : ''}.
                  They stay in the shipment's history.
                </span>
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">Nothing is recorded as paid. This stamps the invoice UNPAID.</p>
            )
          ) : null}

          {showDetails ? (
            <div className="space-y-3">
              {mode === 'partial' ? (
                <div className="space-y-1">
                  <Label htmlFor="part-amount" className="text-xs">Amount received ({invoice.currency})</Label>
                  <Input id="part-amount" type="number" min={0} step={0.01} value={amount} onChange={(e) => setAmount(e.target.value)} />
                  {amount && partProblem ? <p className="text-xs text-red-600">{partProblem}</p> : null}
                  {amount && !partProblem ? (
                    <p className="text-xs text-muted-foreground">Leaves {money(balance - partAmount, invoice.currency)} owing.</p>
                  ) : null}
                </div>
              ) : null}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Method</Label>
                  <Select value={method} onValueChange={setMethod}>
                    <SelectTrigger aria-label="Payment method"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="payment-date" className="text-xs">Date received</Label>
                  <Input id="payment-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="payment-reference" className="text-xs">Reference (optional)</Label>
                  <Input id="payment-reference" placeholder="Bank ref, receipt #…" value={reference} onChange={(e) => setReference(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="payment-note" className="text-xs">Note (optional)</Label>
                  <Input id="payment-note" value={note} onChange={(e) => setNote(e.target.value)} />
                </div>
              </div>
            </div>
          ) : null}

          {payments.length ? (
            <div className="space-y-1">
              <Label className="text-xs">Payments recorded</Label>
              <div className="divide-y rounded-md border">
                {payments.map((p: any, index: number) => (
                  <div key={p.id || `payment-${index}`} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
                    <div className="min-w-0">
                      <span className="font-medium">{money(Number(p.amount) || 0, invoice.currency)}</span>
                      <span className="text-muted-foreground"> · {PAYMENT_METHOD_LABELS[p.method] || p.method || 'Payment'} · {p.date || '—'}</span>
                      {p.reference ? <span className="text-muted-foreground"> · {p.reference}</span> : null}
                      {p.recordedBy === 'driver' ? (
                        <span className="ml-1 inline-flex items-center gap-0.5 rounded bg-blue-50 px-1 text-[10px] font-semibold text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
                          <Truck className="h-3 w-3" /> Driver
                        </span>
                      ) : null}
                    </div>
                    {p.id ? (
                      confirmRemove === p.id ? (
                        <div className="flex shrink-0 gap-1">
                          <Button size="sm" variant="destructive" className="h-7 text-xs" disabled={Boolean(removing)} onClick={() => void remove(p.id)}>
                            {removing === p.id ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Remove'}
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setConfirmRemove(null)}>Keep</Button>
                        </div>
                      ) : (
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="Remove this payment" onClick={() => setConfirmRemove(p.id)}>
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      )
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button
            onClick={() => void save()}
            disabled={saving || Boolean(partProblem && amount)}
            className={mode === 'paid' ? 'bg-emerald-600 hover:bg-emerald-700' : mode === 'partial' ? 'bg-amber-500 hover:bg-amber-600' : ''}
            variant={mode === 'unpaid' ? 'destructive' : 'default'}
          >
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {mode === 'paid' ? 'Mark fully paid' : mode === 'partial' ? 'Record part payment' : 'Mark not paid'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

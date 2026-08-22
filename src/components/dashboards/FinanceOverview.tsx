import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  AlertTriangle, ArrowDownRight, ArrowUpRight, CheckCircle2, Loader2, Receipt, Wallet,
} from 'lucide-react';

// Finance overview — the same server aggregate the staff app's finance screen
// uses (admin_finance_overview), so cash position, reconciliation workload and
// recent transactions cannot disagree between the phone and the browser.

const db = supabase as any;

type Overview = {
  collectedByCurrency: Record<string, number>;
  pendingByCurrency: Record<string, number>;
  pendingPaymentCount: number;
  expensesTotal: number;
  incoming30: number; incomingPrev30: number;
  outgoing30: number; outgoingPrev30: number;
  billedByCurrency: Record<string, number>;
  unpaidInvoices: number;
  outstandingByCurrency: Record<string, number>;
  unreconciledPayments: number;
  pendingProofs: number;
  cashflow: Array<{ day: string; inGBP: number; inEUR: number; out: number }>;
  recentTransactions: Array<{
    id: string; amount: number; currency: string; method: string | null; status: string | null;
    reconciled: boolean; createdAt: string; shipmentId: string | null; reference: string | null;
    customer: string; proofId: string | null;
  }>;
};

const SYMBOL: Record<string, string> = { GBP: '£', EUR: '€', USD: '$' };

function money(amount: number, currency = 'GBP') {
  return `${SYMBOL[currency] || ''}${(Number(amount) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** "£1,240.00 · €310.00" — never collapse currencies into one meaningless total. */
function currencyLine(totals: Record<string, number> | undefined) {
  const entries = Object.entries(totals || {}).filter(([, value]) => Number(value) !== 0);
  if (entries.length === 0) return money(0);
  return entries.map(([currency, value]) => money(Number(value), currency)).join(' · ');
}

function percentChange(current: number, previous: number): number | null {
  if (!previous) return null;
  return Math.round(((current - previous) / Math.abs(previous)) * 100);
}

function Trend({ change }: { change: number | null }) {
  if (change === null) return null;
  const up = change >= 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-semibold ${up ? 'text-emerald-600' : 'text-red-600'}`}>
      {up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
      {Math.abs(change)}%
    </span>
  );
}

/** Inline sparkline. No chart library — one path over the daily net figures. */
function Sparkline({ points }: { points: number[] }) {
  if (points.length < 2) return null;
  const max = Math.max(...points, 1);
  const min = Math.min(...points, 0);
  const span = max - min || 1;
  const d = points
    .map((value, index) => {
      const x = (index / (points.length - 1)) * 100;
      const y = 30 - ((value - min) / span) * 28;
      return `${index === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(' ');
  return (
    <svg viewBox="0 0 100 30" preserveAspectRatio="none" className="w-full h-10" role="img" aria-label="Daily money in">
      <path d={d} fill="none" stroke="currentColor" strokeWidth="1.5" className="text-emerald-600" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export default function FinanceOverview({ onNavigate }: { onNavigate?: (tab: string) => void }) {
  const { toast } = useToast();
  const [overview, setOverview] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data, error: rpcError } = await db.rpc('admin_finance_overview');
    if (rpcError) { setError(rpcError.message); setOverview(null); return; }
    setError(null);
    setOverview(data as Overview);
  }, []);

  useEffect(() => { (async () => { setLoading(true); await load(); setLoading(false); })(); }, [load]);

  useEffect(() => {
    const channel = supabase
      .channel('web-finance-overview')
      .on('postgres_changes' as any, { event: '*', schema: 'public', table: 'payments' } as any, () => load())
      .on('postgres_changes' as any, { event: '*', schema: 'public', table: 'payment_proofs' } as any, () => load())
      .on('postgres_changes' as any, { event: '*', schema: 'public', table: 'driver_invoices' } as any, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [load]);

  const netSeries = useMemo(
    () => (overview?.cashflow || []).slice(-30).map((d) => Number(d.inGBP) + Number(d.inEUR)),
    [overview],
  );

  const reconcile = async (paymentId: string) => {
    setBusy(paymentId);
    const { error: rpcError } = await db.rpc('set_payment_reconciled', {
      p_payment_id: paymentId, p_reconciled: true, p_notes: null,
    });
    setBusy(null);
    if (rpcError) { toast({ title: 'Could not reconcile', description: rpcError.message, variant: 'destructive' }); return; }
    toast({ title: 'Payment reconciled' });
    await load();
  };

  const reviewProof = async (proofId: string, approved: boolean) => {
    setBusy(proofId);
    const { error: rpcError } = await db.rpc('review_payment_proof', {
      p_proof_id: proofId, p_approved: approved, p_finance_notes: null,
    });
    setBusy(null);
    if (rpcError) { toast({ title: 'Review failed', description: rpcError.message, variant: 'destructive' }); return; }
    toast({
      title: approved ? 'Proof approved' : 'Proof rejected',
      description: approved ? 'A payment record has been raised.' : 'The customer has been notified.',
    });
    await load();
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-16 justify-center text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading the finance position…
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-red-300">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-600" /> Finance overview unavailable
          </CardTitle>
          <CardDescription>{error}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button size="sm" variant="outline" onClick={() => load()}>Try again</Button>
        </CardContent>
      </Card>
    );
  }

  if (!overview) return null;

  const net30 = overview.incoming30 - overview.outgoing30;

  return (
    <div className="space-y-4">
      {/* Cash position */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">Collected</p>
              <Wallet className="h-4 w-4 text-emerald-600" />
            </div>
            <p className="text-lg font-bold mt-1">{currencyLine(overview.collectedByCurrency)}</p>
            <p className="text-xs text-muted-foreground mt-0.5">All settled payments</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">Awaiting payment</p>
              <Receipt className="h-4 w-4 text-amber-600" />
            </div>
            <p className="text-lg font-bold mt-1">{currencyLine(overview.pendingByCurrency)}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{overview.pendingPaymentCount} payment(s) open</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">Outstanding invoices</p>
              <Receipt className="h-4 w-4 text-blue-600" />
            </div>
            <p className="text-lg font-bold mt-1">{currencyLine(overview.outstandingByCurrency)}</p>
            <button
              className="text-xs text-emerald-700 underline mt-0.5"
              onClick={() => onNavigate?.('invoices')}
            >
              {overview.unpaidInvoices} unpaid invoice(s)
            </button>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">Net, last 30 days</p>
              <Trend change={percentChange(overview.incoming30, overview.incomingPrev30)} />
            </div>
            <p className={`text-lg font-bold mt-1 ${net30 >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
              {money(net30)}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              In {money(overview.incoming30)} · out {money(overview.outgoing30)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Workload — the two queues finance actually has to clear */}
      {(overview.pendingProofs > 0 || overview.unreconciledPayments > 0) && (
        <div className="grid gap-3 sm:grid-cols-2">
          {overview.pendingProofs > 0 && (
            <Card className="border-amber-300 bg-amber-50/40">
              <CardContent className="p-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">{overview.pendingProofs} payment proof(s) to review</p>
                  <p className="text-xs text-muted-foreground">Customers are waiting on confirmation.</p>
                </div>
                <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => onNavigate?.('payments')}>
                  Open payments
                </Button>
              </CardContent>
            </Card>
          )}
          {overview.unreconciledPayments > 0 && (
            <Card className="border-blue-300 bg-blue-50/40">
              <CardContent className="p-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">{overview.unreconciledPayments} payment(s) unreconciled</p>
                  <p className="text-xs text-muted-foreground">Money received but not matched to the books.</p>
                </div>
                <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => onNavigate?.('payments')}>
                  Reconcile
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Cash flow */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Money in — last 30 days</CardTitle>
          <CardDescription>
            Billed {currencyLine(overview.billedByCurrency)} · expenses {money(overview.expensesTotal)}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {netSeries.length > 1
            ? <Sparkline points={netSeries} />
            : <p className="text-sm text-muted-foreground">Not enough activity yet to draw a trend.</p>}
        </CardContent>
      </Card>

      {/* Recent transactions */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Recent transactions</CardTitle>
          <CardDescription>The last 20 payments, newest first.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {overview.recentTransactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">
                      No payments recorded yet.
                    </TableCell>
                  </TableRow>
                ) : overview.recentTransactions.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="text-sm">{t.customer}</TableCell>
                    <TableCell className="text-xs font-medium text-emerald-700">{t.reference || '—'}</TableCell>
                    <TableCell className="text-right text-sm font-semibold">{money(t.amount, t.currency)}</TableCell>
                    <TableCell className="text-xs capitalize">{(t.method || '—').replace(/_/g, ' ')}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <Badge variant="outline" className="text-[10px] capitalize">{t.status || 'unknown'}</Badge>
                        {t.reconciled && (
                          <span title="Reconciled"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /></span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {t.proofId && !t.reconciled ? (
                        <div className="flex justify-end gap-1">
                          <Button
                            size="sm" variant="outline" className="h-7 text-[11px]"
                            disabled={busy === t.proofId} onClick={() => reviewProof(t.proofId!, true)}
                          >
                            Approve proof
                          </Button>
                          <Button
                            size="sm" variant="outline"
                            className="h-7 text-[11px] border-red-300 text-red-700 hover:bg-red-50"
                            disabled={busy === t.proofId} onClick={() => reviewProof(t.proofId!, false)}
                          >
                            Reject
                          </Button>
                        </div>
                      ) : !t.reconciled ? (
                        <Button
                          size="sm" variant="outline" className="h-7 text-[11px]"
                          disabled={busy === t.id} onClick={() => reconcile(t.id)}
                        >
                          {busy === t.id ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Reconcile'}
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">Done</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

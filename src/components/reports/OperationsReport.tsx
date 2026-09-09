import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { Loader2, TrendingUp, TrendingDown, Package, AlertCircle } from 'lucide-react';

/**
 * What the business made, by route, by month and by what people ship.
 *
 * Every figure comes from `operations_report`, one database function the
 * website and both apps call. Computing revenue in the client would give three
 * chances to compute it three different ways, and a revenue number that differs
 * between two screens is worse than none — somebody has to work out which
 * screen lied.
 *
 * Two things about the numbers that the charts have to respect:
 *
 * Pounds and euros are never summed. Every total is per currency, and the
 * whole report is shown one currency at a time, because a chart mixing them
 * would be a picture of a number that is not money in either.
 *
 * Only issued invoices count. A booking prices itself at the moment it is made,
 * but nobody has asked the customer for that yet; counting it as revenue would
 * overstate every bar on this page. Bookings still waiting for an invoice are
 * called out separately, because that is work outstanding rather than money.
 */

type CurrencyTotal = {
  currency: string;
  shipments: number;
  invoiced: number;
  paid: number;
  outstanding: number;
  per_consignment: number;
};

type RouteRow = CurrencyTotal & { route: string };
type ItemRow = { item: string; quantity: number; shipments: number; currency: string; revenue: number };
type MonthRow = { month: string; currency: string; shipments: number; invoiced: number; paid: number };
type StatusRow = { status: string; shipments: number };

type Report = {
  totals: CurrencyTotal[];
  routes: RouteRow[];
  items: ItemRow[];
  months: MonthRow[];
  statuses: StatusRow[];
  bestRoute: RouteRow | null;
  worstRoute: RouteRow | null;
  awaitingInvoice: number;
  error?: string;
};

/** Distinguishable at a glance, and still distinguishable in greyscale print. */
const SLICE_COLOURS = [
  '#009B68', '#1d4ed8', '#ea580c', '#7c3aed', '#0891b2',
  '#a16207', '#be185d', '#15803d', '#b45309', '#4338ca',
];

const symbolFor = (currency: string) => (currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : `${currency} `);

const money = (value: number, currency: string) =>
  `${symbolFor(currency)}${Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  })}`;

const monthLabel = (month: string) => {
  const parsed = new Date(`${month}-01T12:00:00`);
  return Number.isNaN(parsed.getTime())
    ? month
    : parsed.toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
};

export const OperationsReport: React.FC<{ title?: string }> = ({ title = 'Reports' }) => {
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currency, setCurrency] = useState<string>('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error: rpcError } = await supabase.rpc('operations_report', {
        p_from: null, p_to: null,
      });
      if (cancelled) return;
      if (rpcError) setError(rpcError.message);
      else if ((data as any)?.error) setError(String((data as any).error));
      else {
        const loaded = data as unknown as Report;
        setReport(loaded);
        // Open on whichever currency the business actually earns most in,
        // rather than assuming sterling.
        setCurrency((current) => current || loaded.totals?.[0]?.currency || 'GBP');
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const totals = useMemo(
    () => report?.totals?.find((t) => t.currency === currency) || null,
    [report, currency],
  );

  const routes = useMemo(
    () => (report?.routes || []).filter((r) => r.currency === currency && r.invoiced > 0),
    [report, currency],
  );

  const items = useMemo(
    () => (report?.items || []).filter((i) => i.currency === currency && i.quantity > 0).slice(0, 8),
    [report, currency],
  );

  const months = useMemo(
    () => (report?.months || []).filter((m) => m.currency === currency),
    [report, currency],
  );

  /** Routes that actually name a round — "No route" is not a place to send a driver. */
  const namedRoutes = useMemo(() => routes.filter((r) => r.route !== 'No route'), [routes]);
  const best = namedRoutes[0] || null;
  const worst = namedRoutes.length > 1 ? namedRoutes[namedRoutes.length - 1] : null;
  const unrouted = routes.find((r) => r.route === 'No route') || null;

  if (loading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-zim-green" />
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex items-center gap-3 p-6 text-sm text-amber-900">
          <AlertCircle className="h-5 w-5" /> {error}
        </CardContent>
      </Card>
    );
  }

  if (!report || !report.totals?.length) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          <Package className="mx-auto mb-3 h-10 w-10 opacity-40" />
          <p>Nothing has been invoiced yet, so there is nothing to report on.</p>
          {report?.awaitingInvoice ? (
            <p className="mt-2 text-sm">
              {report.awaitingInvoice} booking{report.awaitingInvoice === 1 ? '' : 's'} are priced and waiting for an invoice.
            </p>
          ) : null}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">{title}</h2>
          <p className="text-sm text-muted-foreground">
            Issued invoices only — a booking that has not been invoiced is not revenue.
          </p>
        </div>
        <div className="flex gap-2">
          {report.totals.map((t) => (
            <Button
              key={t.currency}
              size="sm"
              variant={t.currency === currency ? 'default' : 'outline'}
              onClick={() => setCurrency(t.currency)}
            >
              {symbolFor(t.currency).trim() || t.currency} {t.currency}
            </Button>
          ))}
        </div>
      </div>

      {report.awaitingInvoice > 0 ? (
        <div className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {report.awaitingInvoice} booking{report.awaitingInvoice === 1 ? '' : 's'} priced but not invoiced — not counted below.
        </div>
      ) : null}

      {/* ── Headline figures ── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Invoiced" value={money(totals?.invoiced || 0, currency)} />
        <Stat label="Paid" value={money(totals?.paid || 0, currency)} tone="text-green-700" />
        <Stat
          label="Outstanding"
          value={money(totals?.outstanding || 0, currency)}
          tone={(totals?.outstanding || 0) > 0 ? 'text-red-700' : 'text-green-700'}
        />
        <Stat
          label="Per consignment"
          value={money(totals?.per_consignment || 0, currency)}
          hint={`across ${totals?.shipments || 0} shipment${totals?.shipments === 1 ? '' : 's'}`}
        />
      </div>

      {/* ── Best and worst earning route ── */}
      <div className="grid gap-4 md:grid-cols-2">
        <RouteCard
          heading="Highest earning route"
          icon={<TrendingUp className="h-5 w-5 text-green-700" />}
          route={best}
          currency={currency}
          empty="No shipment has been put on a named route yet."
        />
        <RouteCard
          heading="Lowest earning route"
          icon={<TrendingDown className="h-5 w-5 text-amber-700" />}
          route={worst}
          currency={currency}
          empty="Only one route has earned anything so far."
        />
      </div>

      {unrouted ? (
        <p className="text-sm text-muted-foreground">
          {money(unrouted.invoiced, currency)} across {unrouted.shipments} shipment
          {unrouted.shipments === 1 ? '' : 's'} is not on any route, so it counts towards the totals above
          but towards no route.
        </p>
      ) : null}

      {/* ── Revenue by route ── */}
      <Card>
        <CardHeader>
          <CardTitle>Revenue by route</CardTitle>
          <CardDescription>What each collection round has invoiced, and how much of it is paid.</CardDescription>
        </CardHeader>
        <CardContent>
          {routes.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Nothing invoiced in {currency} yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(260, routes.length * 42)}>
              <BarChart data={routes} layout="vertical" margin={{ left: 20, right: 24 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tickFormatter={(v) => money(v, currency)} fontSize={11} />
                <YAxis type="category" dataKey="route" width={150} fontSize={11} />
                <Tooltip formatter={(v: number) => money(v, currency)} />
                <Legend />
                {/* Animated on mount, then still — a chart that re-animates on
                    every hover is harder to read, not livelier. */}
                <Bar dataKey="invoiced" name="Invoiced" fill="#009B68" radius={[0, 4, 4, 0]} animationDuration={900} />
                <Bar dataKey="paid" name="Paid" fill="#1d4ed8" radius={[0, 4, 4, 0]} animationDuration={1200} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* ── What people ship ── */}
        <Card>
          <CardHeader>
            <CardTitle>What people ship most</CardTitle>
            <CardDescription>By quantity across every invoiced consignment.</CardDescription>
          </CardHeader>
          <CardContent>
            {items.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No invoice lines in {currency} yet.</p>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={items}
                      dataKey="quantity"
                      nameKey="item"
                      innerRadius={55}
                      outerRadius={100}
                      paddingAngle={2}
                      animationDuration={900}
                    >
                      {items.map((entry, index) => (
                        <Cell key={entry.item} fill={SLICE_COLOURS[index % SLICE_COLOURS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number, _name, entry: any) =>
                        [`${value} shipped · ${money(entry?.payload?.revenue || 0, currency)}`, entry?.payload?.item]}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <ul className="mt-2 space-y-1">
                  {items.map((entry, index) => (
                    <li key={entry.item} className="flex items-center gap-2 text-sm">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: SLICE_COLOURS[index % SLICE_COLOURS.length] }}
                      />
                      <span className="min-w-0 flex-1 truncate">{entry.item}</span>
                      <span className="text-muted-foreground">{entry.quantity}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </CardContent>
        </Card>

        {/* ── Month by month ── */}
        <Card>
          <CardHeader>
            <CardTitle>Month by month</CardTitle>
            <CardDescription>Invoiced against paid, by the month the booking was made.</CardDescription>
          </CardHeader>
          <CardContent>
            {months.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Nothing invoiced in {currency} yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={months} margin={{ left: 8, right: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" tickFormatter={monthLabel} fontSize={11} />
                  <YAxis tickFormatter={(v) => money(v, currency)} fontSize={11} width={80} />
                  <Tooltip formatter={(v: number) => money(v, currency)} labelFormatter={monthLabel} />
                  <Legend />
                  <Line
                    type="monotone" dataKey="invoiced" name="Invoiced"
                    stroke="#009B68" strokeWidth={2.5} dot={{ r: 3 }} animationDuration={1000}
                  />
                  <Line
                    type="monotone" dataKey="paid" name="Paid"
                    stroke="#1d4ed8" strokeWidth={2.5} dot={{ r: 3 }} animationDuration={1300}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Route table ── */}
      <Card>
        <CardHeader>
          <CardTitle>Every route</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                <th className="pb-2">Route</th>
                <th className="pb-2 text-right">Shipments</th>
                <th className="pb-2 text-right">Invoiced</th>
                <th className="pb-2 text-right">Paid</th>
                <th className="pb-2 text-right">Outstanding</th>
                <th className="pb-2 text-right">Per consignment</th>
              </tr>
            </thead>
            <tbody>
              {routes.map((r) => (
                <tr key={r.route} className="border-b last:border-0">
                  <td className="py-2 font-medium">{r.route}</td>
                  <td className="py-2 text-right">{r.shipments}</td>
                  <td className="py-2 text-right">{money(r.invoiced, currency)}</td>
                  <td className="py-2 text-right text-green-700">{money(r.paid, currency)}</td>
                  <td className={`py-2 text-right ${r.outstanding > 0 ? 'text-red-700' : ''}`}>
                    {money(r.outstanding, currency)}
                  </td>
                  <td className="py-2 text-right">{money(r.per_consignment, currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
};

const Stat: React.FC<{ label: string; value: string; tone?: string; hint?: string }> = ({
  label, value, tone, hint,
}) => (
  <Card className="transition-shadow hover:shadow-md">
    <CardContent className="p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${tone || ''}`}>{value}</p>
      {hint ? <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p> : null}
    </CardContent>
  </Card>
);

const RouteCard: React.FC<{
  heading: string;
  icon: React.ReactNode;
  route: RouteRow | null;
  currency: string;
  empty: string;
}> = ({ heading, icon, route, currency, empty }) => (
  <Card>
    <CardContent className="p-4">
      <div className="flex items-center gap-2">
        {icon}
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{heading}</p>
      </div>
      {route ? (
        <>
          <p className="mt-2 text-lg font-bold">{route.route}</p>
          <p className="text-2xl font-bold text-zim-green">{money(route.invoiced, currency)}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {route.shipments} shipment{route.shipments === 1 ? '' : 's'} ·{' '}
            {money(route.per_consignment, currency)} each
          </p>
          {route.outstanding > 0 ? (
            <Badge variant="outline" className="mt-2 text-red-700">
              {money(route.outstanding, currency)} outstanding
            </Badge>
          ) : null}
        </>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">{empty}</p>
      )}
    </CardContent>
  </Card>
);

export default OperationsReport;

import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Search, AlertCircle, ChevronRight, ArrowLeft } from 'lucide-react';

/**
 * What each customer is worth, and what they still owe.
 *
 * The numbers come from `customer_accounts`, the same database function the
 * staff app calls, so a balance quoted on the phone matches the one on screen.
 *
 * Balances are per currency and never blended. A customer who has shipped from
 * both Ireland and the UK owes two amounts, and adding them would produce a
 * figure that reconciles against neither bank account.
 */

type Balance = { currency: string; spent: number; paid: number; owed: number; shipments: number };

type Account = {
  customer_id: string;
  full_name: string | null;
  /** Internal identifier (ANN00079). The customer has never seen this. */
  customer_code: string | null;
  /** The booking reference they read off their invoice (ANN09260012). */
  customer_reference: string | null;
  customer_references: string[] | null;
  phone: string | null;
  email: string | null;
  country: string | null;
  pickup_address: string | null;
  pickup_city: string | null;
  pickup_postcode: string | null;
  customer_since: string | null;
  shipments: number;
  last_booked: string | null;
  balances: Balance[];
};

type StatementLine = {
  shipmentId: string;
  at: string;
  reference: string | null;
  kind: 'charge' | 'payment';
  amount: number;
  currency: string;
  method: string | null;
  balance: number;
};

type AccountShipment = {
  shipmentId: string;
  reference: string | null;
  invoiceNumber: string | null;
  status: string | null;
  route: string | null;
  bookedOn: string;
  currency: string;
  invoiced: number;
  paid: number;
  balance: number;
};

type ItemRow = { item: string; quantity: number; shipments: number; currency: string; revenue: number };

const symbolFor = (currency: string) => (currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : `${currency} `);

const money = (value: number, currency: string) =>
  `${symbolFor(currency)}${Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  })}`;

export const CustomerAccounts: React.FC = () => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const [items, setItems] = useState<ItemRow[]>([]);
  const [shipments, setShipments] = useState<AccountShipment[]>([]);
  const [statement, setStatement] = useState<StatementLine[]>([]);
  const [itemsLoading, setItemsLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error: rpcError } = await supabase.rpc('customer_accounts', { p_customer_id: null });
      if (cancelled) return;
      if (rpcError) setError(rpcError.message);
      else if ((data as any)?.error) setError(String((data as any).error));
      else setAccounts(((data as any)?.customers || []) as Account[]);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  // The item breakdown is fetched only for the customer being opened; loading
  // it for all 140 would be a lot of line items nobody is looking at.
  useEffect(() => {
    if (!openId) { setItems([]); setShipments([]); setStatement([]); return; }
    let cancelled = false;
    setItemsLoading(true);
    (async () => {
      const [{ data }, { data: lines }] = await Promise.all([
        supabase.rpc('customer_accounts', { p_customer_id: openId }),
        // The ledger. `customer_statement` owns the ordering rule, which is not
        // obvious: a payment carries a plain date (midnight) while the invoice
        // it settles carries the booking's real time, so ordering by timestamp
        // opens the statement in credit.
        supabase.rpc('customer_statement', { p_customer_id: openId }),
      ]);
      if (cancelled) return;
      setItems(((data as any)?.items || []) as ItemRow[]);
      setShipments(((data as any)?.shipments || []) as AccountShipment[]);
      setStatement(Array.isArray(lines) ? (lines as StatementLine[]) : []);
      setItemsLoading(false);
    })();
    return () => { cancelled = true; };
  }, [openId]);

  const visible = useMemo(() => {
    const text = query.trim().toLowerCase();
    if (!text) return accounts;
    return accounts.filter((a) =>
      [a.full_name, a.customer_code, a.customer_reference, a.phone, a.email]
        .some((field) => String(field || '').toLowerCase().includes(text))
      || (a.customer_references || []).some((ref) => String(ref).toLowerCase().includes(text)));
  }, [accounts, query]);

  /** Owing customers first — that is the reason to open this screen. */
  const owing = useMemo(
    () => accounts.filter((a) => a.balances?.some((b) => b.owed > 0.005)).length,
    [accounts],
  );

  const open = useMemo(() => accounts.find((a) => a.customer_id === openId) || null, [accounts, openId]);

  if (loading) {
    return (
      <div className="flex min-h-[240px] items-center justify-center">
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

  if (open) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => setOpenId(null)}>
          <ArrowLeft className="mr-1 h-4 w-4" /> All customers
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>{open.full_name || 'Unnamed customer'}</CardTitle>
            <CardDescription>
              {[open.customer_reference, open.phone, open.email, open.country].filter(Boolean).join(' · ')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              {open.balances?.map((b) => (
                <React.Fragment key={b.currency}>
                  <Stat label={`Spent (${b.currency})`} value={money(b.spent, b.currency)} />
                  <Stat label="Paid" value={money(b.paid, b.currency)} tone="text-green-700" />
                  <Stat
                    label="Owes"
                    value={money(b.owed, b.currency)}
                    tone={b.owed > 0.005 ? 'text-red-700' : 'text-green-700'}
                  />
                </React.Fragment>
              ))}
            </div>
            {(open.customer_references || []).length > 1 ? (
              <p className="text-xs text-muted-foreground">
                References: {(open.customer_references || []).join(', ')}
              </p>
            ) : null}
            <p className="text-sm text-muted-foreground">
              {open.shipments} invoiced shipment{open.shipments === 1 ? '' : 's'}
              {open.last_booked ? ` · last booked ${new Date(open.last_booked).toLocaleDateString()}` : ''}
            </p>
          </CardContent>
        </Card>

        <Tabs defaultValue="details">
          <TabsList>
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="statement">Statement</TabsTrigger>
            <TabsTrigger value="shipments">Shipments</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Customer details</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="divide-y text-sm">
                  <Detail k="Name" v={open.full_name} />
                  <Detail k="Reference" v={open.customer_reference} />
                  {(open.customer_references || []).length > 1 ? (
                    <Detail k="All references" v={(open.customer_references || []).join(', ')} />
                  ) : null}
                  <Detail k="Account code" v={open.customer_code} />
                  <Detail k="Phone" v={open.phone} />
                  <Detail k="Email" v={open.email} />
                  <Detail k="Country" v={open.country} />
                  <Detail
                    k="Collection address"
                    v={[open.pickup_address, open.pickup_city, open.pickup_postcode].filter(Boolean).join(', ')}
                  />
                  <Detail
                    k="Customer since"
                    v={open.customer_since ? new Date(open.customer_since).toLocaleDateString() : null}
                  />
                  <Detail
                    k="Last booked"
                    v={open.last_booked ? new Date(open.last_booked).toLocaleDateString() : null}
                  />
                </dl>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>What they ship</CardTitle>
                <CardDescription>Every line they have been invoiced for, most shipped first.</CardDescription>
              </CardHeader>
              <CardContent>
                {itemsLoading ? (
                  <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin" /></div>
                ) : items.length === 0 ? (
                  <p className="py-4 text-center text-sm text-muted-foreground">Nothing invoiced yet.</p>
                ) : (
                  <ul className="divide-y">
                    {items.map((row) => (
                      <li key={`${row.item}-${row.currency}`} className="flex items-center gap-3 py-2.5">
                        <span className="min-w-0 flex-1 truncate text-sm font-medium">{row.item}</span>
                        <span className="text-sm text-muted-foreground">
                          ×{row.quantity} over {row.shipments} shipment{row.shipments === 1 ? '' : 's'}
                        </span>
                        <span className="text-sm font-semibold">{money(row.revenue, row.currency)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="statement">
            <Card>
              <CardHeader>
                <CardTitle>Statement</CardTitle>
                <CardDescription>
                  Every invoice raised and every payment received, oldest first, with a running balance.
                </CardDescription>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                {itemsLoading ? (
                  <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin" /></div>
                ) : statement.length === 0 ? (
                  <p className="py-4 text-center text-sm text-muted-foreground">Nothing invoiced or paid yet.</p>
                ) : (
                  <table className="w-full min-w-[520px] text-sm">
                    <thead>
                      <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                        <th className="pb-2">Date</th>
                        <th className="pb-2">Reference</th>
                        <th className="pb-2">Detail</th>
                        <th className="pb-2 text-right">Amount</th>
                        <th className="pb-2 text-right">Balance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {statement.map((line, index) => {
                        const charge = line.kind === 'charge';
                        return (
                          <tr key={`${line.shipmentId}-${index}`} className="border-b last:border-0">
                            <td className="py-2 whitespace-nowrap">{new Date(line.at).toLocaleDateString()}</td>
                            <td className="py-2 font-medium">{line.reference || '—'}</td>
                            <td className="py-2 text-muted-foreground">
                              {charge ? 'Invoice' : `Payment${line.method ? ` · ${line.method}` : ''}`}
                            </td>
                            <td className={`py-2 text-right ${charge ? '' : 'text-green-700'}`}>
                              {charge ? '' : '−'}{money(Math.abs(line.amount), line.currency)}
                            </td>
                            <td className="py-2 text-right font-semibold">
                              {money(line.balance, line.currency)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="shipments">
            <Card>
              <CardHeader>
                <CardTitle>Invoiced shipments</CardTitle>
                <CardDescription>The consignments behind the balance.</CardDescription>
              </CardHeader>
              <CardContent>
                {itemsLoading ? (
                  <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin" /></div>
                ) : shipments.length === 0 ? (
                  <p className="py-4 text-center text-sm text-muted-foreground">No invoiced shipment yet.</p>
                ) : (
                  <ul className="divide-y">
                    {shipments.map((row) => (
                      <li key={row.shipmentId} className="flex items-center gap-3 py-2.5">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{row.reference || '—'}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {new Date(row.bookedOn).toLocaleDateString()} · {row.status || 'No status'}
                            {row.route ? ` · ${row.route}` : ''}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold">{money(row.invoiced, row.currency)}</p>
                          <p className={`text-xs ${row.balance > 0.005 ? 'text-red-700' : 'text-green-700'}`}>
                            {row.balance > 0.005 ? `${money(row.balance, row.currency)} left` : 'paid'}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">Customer accounts</h2>
          <p className="text-sm text-muted-foreground">
            {accounts.length} customer{accounts.length === 1 ? '' : 's'} with invoiced shipments
            {owing > 0 ? ` · ${owing} still owing` : ''}
          </p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Name, reference, phone or email"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      {visible.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            {query ? `No customer matches “${query.trim()}”.` : 'No customer has an invoiced shipment yet.'}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {visible.map((account) => {
            const owed = account.balances?.filter((b) => b.owed > 0.005) || [];
            return (
              <button
                key={account.customer_id}
                type="button"
                onClick={() => setOpenId(account.customer_id)}
                className="flex w-full items-center gap-3 rounded-lg border bg-white p-3 text-left transition-colors hover:bg-gray-50"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{account.full_name || 'Unnamed customer'}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {[account.customer_reference, account.phone].filter(Boolean).join(' · ')} ·{' '}
                    {account.shipments} shipment{account.shipments === 1 ? '' : 's'}
                  </p>
                </div>
                <div className="text-right">
                  {account.balances?.map((b) => (
                    <p key={b.currency} className="text-sm font-semibold">{money(b.spent, b.currency)}</p>
                  ))}
                  {owed.length > 0 ? (
                    <Badge variant="outline" className="mt-1 border-red-200 text-red-700">
                      {owed.map((b) => money(b.owed, b.currency)).join(' + ')} owed
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="mt-1 border-green-200 text-green-700">Settled</Badge>
                  )}
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

const Detail: React.FC<{ k: string; v: string | null | undefined }> = ({ k, v }) => (
  <div className="flex gap-4 py-2">
    <dt className="w-40 shrink-0 text-muted-foreground">{k}</dt>
    <dd className="min-w-0 flex-1 break-words">{v && String(v).trim() ? v : '—'}</dd>
  </div>
);

const Stat: React.FC<{ label: string; value: string; tone?: string }> = ({ label, value, tone }) => (
  <div className="rounded-lg border p-3">
    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
    <p className={`mt-1 text-xl font-bold ${tone || ''}`}>{value}</p>
  </div>
);

export default CustomerAccounts;

import { supabase } from './supabase';

/**
 * Revenue and customer balances, from the database.
 *
 * These call `operations_report` and `customer_accounts`, the same two
 * functions the website calls. Nothing here recomputes money: a total worked
 * out separately on the phone would eventually disagree with the one on the
 * website, and then somebody has to work out which screen lied.
 */

export type CurrencyTotal = {
  currency: string;
  shipments: number;
  invoiced: number;
  paid: number;
  outstanding: number;
  per_consignment: number;
};

export type RouteRow = CurrencyTotal & { route: string };
export type ItemRow = { item: string; quantity: number; shipments: number; currency: string; revenue: number };
export type MonthRow = { month: string; currency: string; shipments: number; invoiced: number; paid: number };

export type OperationsReport = {
  totals: CurrencyTotal[];
  routes: RouteRow[];
  items: ItemRow[];
  months: MonthRow[];
  statuses: Array<{ status: string; shipments: number }>;
  bestRoute: RouteRow | null;
  worstRoute: RouteRow | null;
  awaitingInvoice: number;
};

export type Balance = { currency: string; spent: number; paid: number; owed: number; shipments: number };

export type CustomerAccount = {
  customer_id: string;
  full_name: string | null;
  customer_code: string | null;
  phone: string | null;
  email: string | null;
  country: string | null;
  shipments: number;
  last_booked: string | null;
  balances: Balance[];
};

export type Fetched<T> = { ok: true; data: T } | { ok: false; message: string };

export async function fetchOperationsReport(
  from?: string | null,
  to?: string | null,
): Promise<Fetched<OperationsReport>> {
  const { data, error } = await supabase.rpc('operations_report', {
    p_from: from ?? null,
    p_to: to ?? null,
  });
  if (error) return { ok: false, message: error.message };
  if ((data as any)?.error) return { ok: false, message: String((data as any).error) };
  return { ok: true, data: data as unknown as OperationsReport };
}

export async function fetchCustomerAccounts(
  customerId?: string | null,
): Promise<Fetched<{ customers: CustomerAccount[]; items: ItemRow[] }>> {
  const { data, error } = await supabase.rpc('customer_accounts', {
    p_customer_id: customerId ?? null,
  });
  if (error) return { ok: false, message: error.message };
  if ((data as any)?.error) return { ok: false, message: String((data as any).error) };
  return {
    ok: true,
    data: {
      customers: ((data as any)?.customers || []) as CustomerAccount[],
      items: ((data as any)?.items || []) as ItemRow[],
    },
  };
}

export const symbolFor = (currency: string) =>
  (currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : `${currency} `);

/**
 * Bars sized against the largest value in the set.
 *
 * Returned as a fraction rather than a width so the caller decides the pixels;
 * a chart drawn at one width on a phone and another on a tablet should use the
 * same maths.
 */
export function barFractions<T>(rows: T[], value: (row: T) => number): number[] {
  const values = rows.map((row) => Math.max(0, Number(value(row)) || 0));
  const largest = Math.max(0, ...values);
  // Everything at zero means an empty chart, not a full one.
  if (largest <= 0) return values.map(() => 0);
  return values.map((v) => v / largest);
}

/**
 * Slice angles for a pie, as cumulative [start, end] turns.
 *
 * Turns rather than degrees or radians so the caller can pick; the important
 * part is that the slices always add to exactly one turn, with any rounding
 * absorbed by the last slice rather than leaving a hairline gap.
 */
export function pieSlices<T>(rows: T[], value: (row: T) => number): Array<{ start: number; end: number }> {
  const values = rows.map((row) => Math.max(0, Number(value(row)) || 0));
  const total = values.reduce((sum, v) => sum + v, 0);
  if (total <= 0) return values.map(() => ({ start: 0, end: 0 }));
  const slices: Array<{ start: number; end: number }> = [];
  let cursor = 0;
  values.forEach((v, index) => {
    const start = cursor;
    const end = index === values.length - 1 ? 1 : start + v / total;
    slices.push({ start, end });
    cursor = end;
  });
  return slices;
}

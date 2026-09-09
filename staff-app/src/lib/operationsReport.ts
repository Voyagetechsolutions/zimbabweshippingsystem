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
export type PeriodRow = {
  period_id: string;
  period: string;
  currency: string;
  shipments: number;
  invoiced: number;
  paid: number;
  outstanding: number;
  last_collection: string | null;
};

export type PeriodOption = { periodId: string; name: string; shipments: number; lastCollection: string | null };

export type OperationsReport = {
  totals: CurrencyTotal[];
  routes: RouteRow[];
  items: ItemRow[];
  periods: PeriodRow[];
  statuses: Array<{ status: string; shipments: number }>;
  bestRoute: RouteRow | null;
  worstRoute: RouteRow | null;
  awaitingInvoice: number;
};

export type Balance = { currency: string; spent: number; paid: number; owed: number; shipments: number };

export type StatementLine = {
  shipmentId: string;
  at: string;
  reference: string | null;
  kind: 'charge' | 'payment';
  amount: number;
  currency: string;
  method: string | null;
  balance: number;
};

export type AccountShipment = {
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

export type CustomerAccount = {
  customer_id: string;
  full_name: string | null;
  /** Internal identifier (ANN00079); the customer has never seen it. */
  customer_code: string | null;
  /** The booking reference printed on their invoice (ANN09260012). */
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

export type Fetched<T> = { ok: true; data: T } | { ok: false; message: string };

export async function fetchOperationsReport(
  periodId?: string | null,
): Promise<Fetched<OperationsReport>> {
  const { data, error } = await supabase.rpc('operations_report', {
    p_from: null,
    p_to: null,
    // Shipments are filed under a collection period everywhere else, so the
    // report is scoped that way rather than by a date range.
    p_period_id: periodId ?? null,
  });
  if (error) return { ok: false, message: error.message };
  if ((data as any)?.error) return { ok: false, message: String((data as any).error) };
  return { ok: true, data: data as unknown as OperationsReport };
}

export async function fetchCustomerAccounts(
  customerId?: string | null,
): Promise<Fetched<{ customers: CustomerAccount[]; items: ItemRow[]; shipments: AccountShipment[] }>> {
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
      shipments: ((data as any)?.shipments || []) as AccountShipment[],
    },
  };
}

/**
 * The customer's ledger: every invoice raised and every payment received,
 * oldest first, with a running balance per currency.
 *
 * `customer_statement` owns the ordering rule, which is not obvious — a payment
 * carries a plain date (midnight) while the invoice it settles carries the
 * booking's real time, so ordering by timestamp opens the statement in credit.
 */
export async function fetchCustomerStatement(customerId: string): Promise<StatementLine[]> {
  const { data, error } = await supabase.rpc('customer_statement', { p_customer_id: customerId });
  if (error || !Array.isArray(data)) return [];
  return data as StatementLine[];
}

/** The collection periods worth offering: those holding an issued invoice. */
export async function fetchReportPeriods(): Promise<PeriodOption[]> {
  const { data, error } = await supabase.rpc('report_periods');
  if (error || !Array.isArray(data)) return [];
  return data as PeriodOption[];
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

/**
 * What a customer has to pay, and when.
 *
 * Announced by the company in the week of 2026-09-01: a booking under 1000 is
 * paid in full; at 1000 or above the customer pays half upfront and the balance
 * on collection. The threshold is the number 1000 in the currency the booking
 * is priced in — £1000 in the UK, €1000 in Ireland — so it can be quoted over
 * the phone without anybody converting anything.
 *
 * This file is the single statement of that rule. The website, the customer app
 * and the staff app all read it, because three copies of a pricing rule become
 * three different pricing rules the first time one of them changes.
 */

/** Only the standard method is split. Cash and pay-on-arrival settle at once. */
export type PaymentMethodId = 'standard' | 'cashOnCollection' | 'payOnArrival';

export interface PaymentPolicy {
  /** Booking total at or above which a deposit applies. */
  depositThreshold: number;
  /** Percentage payable upfront above the threshold. */
  depositPercent: number;
  /** Surcharge for choosing to pay when the goods arrive. */
  payOnArrivalPremiumPercent: number;
}

export const DEFAULT_PAYMENT_POLICY: PaymentPolicy = {
  depositThreshold: 1000,
  depositPercent: 50,
  payOnArrivalPremiumPercent: 20,
};

export interface PaymentBreakdown {
  /** Total after any pay-on-arrival premium. */
  total: number;
  /** Premium added for paying on arrival; 0 otherwise. */
  premium: number;
  /** Payable now. Equals `total` when the booking settles in one go. */
  dueNow: number;
  /** Payable on collection. 0 when the booking settles in one go. */
  dueOnCollection: number;
  /** True when the deposit rule applied. */
  isSplit: boolean;
  /** One line a customer can read, e.g. "50% (£600) now, £600 on collection". */
  summary: string;
}

const round2 = (value: number) => Math.round((Number(value) || 0) * 100) / 100;

/**
 * Split a booking total into what is due now and what is due on collection.
 *
 * `baseTotal` is the price before any pay-on-arrival premium. The premium is
 * applied first and the threshold tested against the resulting total, because
 * the total is what the customer actually owes — testing the pre-premium figure
 * would let a booking priced at 990 plus premium sit above 1000 and still be
 * treated as payable in full.
 */
export function paymentBreakdown(
  baseTotal: number,
  method: PaymentMethodId,
  symbol = '£',
  policy: Partial<PaymentPolicy> = {},
): PaymentBreakdown {
  const { depositThreshold, depositPercent, payOnArrivalPremiumPercent } = {
    ...DEFAULT_PAYMENT_POLICY,
    ...policy,
  };

  const base = Math.max(0, Number(baseTotal) || 0);
  const premium = method === 'payOnArrival'
    ? round2(base * (payOnArrivalPremiumPercent / 100))
    : 0;
  const total = round2(base + premium);

  const money = (value: number) => `${symbol}${value.toFixed(2)}`;

  // Only the standard method splits. Cash on collection is already collected at
  // the door, and pay on arrival is by definition paid at the far end — asking
  // for half of either upfront would contradict the method the customer chose.
  const splits = method === 'standard' && total >= depositThreshold && depositThreshold > 0;
  if (!splits) {
    return {
      total,
      premium,
      dueNow: total,
      dueOnCollection: 0,
      isSplit: false,
      summary: `${money(total)} payable in full`,
    };
  }

  const dueNow = round2(total * (depositPercent / 100));
  // Taken as the remainder rather than computed again, so the two halves always
  // add back to the total even when the percentage does not divide cleanly.
  const dueOnCollection = round2(total - dueNow);

  return {
    total,
    premium,
    dueNow,
    dueOnCollection,
    isSplit: true,
    summary: `${depositPercent}% (${money(dueNow)}) now, ${money(dueOnCollection)} on collection`,
  };
}

/** The policy as the app configuration holds it, with sane fallbacks. */
export function policyFromConfig(fees: any): PaymentPolicy {
  const num = (value: unknown, fallback: number) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
  };
  return {
    depositThreshold: num(fees?.depositThreshold, DEFAULT_PAYMENT_POLICY.depositThreshold),
    depositPercent: num(fees?.depositPercent, DEFAULT_PAYMENT_POLICY.depositPercent),
    payOnArrivalPremiumPercent: num(
      fees?.payOnArrivalPremiumPercent,
      DEFAULT_PAYMENT_POLICY.payOnArrivalPremiumPercent,
    ),
  };
}

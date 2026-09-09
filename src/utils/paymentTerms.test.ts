import { describe, expect, it } from 'vitest';
import { paymentBreakdown, policyFromConfig, DEFAULT_PAYMENT_POLICY } from './paymentTerms';

describe('paymentBreakdown', () => {
  it('takes a booking under the threshold in full', () => {
    const b = paymentBreakdown(999.99, 'standard');
    expect(b.isSplit).toBe(false);
    expect(b.dueNow).toBe(999.99);
    expect(b.dueOnCollection).toBe(0);
  });

  it('splits exactly at the threshold', () => {
    // "under 1000 is paid in full, above 1000 pays 50%" — 1000 itself is not
    // under 1000, so it splits.
    const b = paymentBreakdown(1000, 'standard');
    expect(b.isSplit).toBe(true);
    expect(b.dueNow).toBe(500);
    expect(b.dueOnCollection).toBe(500);
  });

  it('splits a large standard booking in half', () => {
    const b = paymentBreakdown(1840, 'standard');
    expect(b.dueNow).toBe(920);
    expect(b.dueOnCollection).toBe(920);
    expect(b.summary).toBe('50% (£920.00) now, £920.00 on collection');
  });

  it('never loses a penny to rounding', () => {
    // 1000.01 halves to 500.005; the two halves must still add to the total.
    const b = paymentBreakdown(1000.01, 'standard');
    expect(b.dueNow + b.dueOnCollection).toBeCloseTo(b.total, 2);
  });

  it('adds the pay-on-arrival premium', () => {
    const b = paymentBreakdown(500, 'payOnArrival');
    expect(b.premium).toBe(100);
    expect(b.total).toBe(600);
  });

  it('tests the threshold against the total, premium included', () => {
    // 900 + 20% = 1080, which is over the threshold — but pay on arrival is
    // settled at the far end, so it must not also demand a deposit.
    const b = paymentBreakdown(900, 'payOnArrival');
    expect(b.total).toBe(1080);
    expect(b.isSplit).toBe(false);
    expect(b.dueNow).toBe(1080);
  });

  it('does not split cash on collection, however large', () => {
    const b = paymentBreakdown(5000, 'cashOnCollection');
    expect(b.isSplit).toBe(false);
    expect(b.premium).toBe(0);
    expect(b.dueNow).toBe(5000);
  });

  it('uses the booking currency symbol', () => {
    expect(paymentBreakdown(1200, 'standard', '€').summary)
      .toBe('50% (€600.00) now, €600.00 on collection');
  });

  it('treats the threshold as the plain number in either currency', () => {
    // €1000 splits exactly as £1000 does; nothing is converted.
    expect(paymentBreakdown(1000, 'standard', '€').isSplit).toBe(true);
    expect(paymentBreakdown(999, 'standard', '€').isSplit).toBe(false);
  });

  it('handles nonsense totals without producing nonsense money', () => {
    for (const bad of [NaN, -50, undefined as any, null as any]) {
      const b = paymentBreakdown(bad, 'standard');
      expect(b.total).toBe(0);
      expect(b.dueNow).toBe(0);
    }
  });
});

describe('policyFromConfig', () => {
  it('reads the live configuration', () => {
    expect(policyFromConfig({ depositThreshold: 2000, depositPercent: 25, payOnArrivalPremiumPercent: 10 }))
      .toEqual({ depositThreshold: 2000, depositPercent: 25, payOnArrivalPremiumPercent: 10 });
  });

  it('keeps a zero the office deliberately set', () => {
    // A premium of 0 is a real business choice, not a missing value.
    expect(policyFromConfig({ payOnArrivalPremiumPercent: 0 }).payOnArrivalPremiumPercent).toBe(0);
  });

  it('falls back when a value is missing or unusable', () => {
    expect(policyFromConfig({})).toEqual(DEFAULT_PAYMENT_POLICY);
    expect(policyFromConfig(null)).toEqual(DEFAULT_PAYMENT_POLICY);
    expect(policyFromConfig({ depositThreshold: 'lots' }).depositThreshold).toBe(1000);
    expect(policyFromConfig({ depositPercent: -5 }).depositPercent).toBe(50);
  });
});

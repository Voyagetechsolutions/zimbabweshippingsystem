import { describe, expect, it } from 'vitest';
import { allocateSharedCost, calculateDocumentTotals, convertCurrency, invoiceBalance, journalBalance, paymentAllocation, receivableAge } from './financeCore';

describe('finance core', () => {
  it('calculates invoice discounts and tax without taxing the discount', () => {
    expect(calculateDocumentTotals([{ quantity: 2, unitPrice: 280, discount: 60, taxRate: 20 }]))
      .toEqual({ subtotal: 560, discount: 60, tax: 100, total: 600 });
  });

  it('tracks partial payments and credits', () => {
    expect(invoiceBalance(580, [280, 100], [20])).toEqual({ paid: 380, credited: 20, balance: 180 });
  });

  it('detects payment over-allocation', () => {
    expect(paymentAllocation(280, [200, 80])).toEqual({ allocated: 280, unallocated: 0, overallocated: false });
    expect(paymentAllocation(280, [200, 90]).overallocated).toBe(true);
  });

  it('preserves explicit FX conversion', () => {
    expect(convertCurrency(325, 0.8604)).toBe(279.63);
    expect(() => convertCurrency(325, 0)).toThrow('Exchange rate');
  });

  it('only accepts a balanced non-empty journal', () => {
    expect(journalBalance([{ debit: 280 }, { credit: 280 }]).balanced).toBe(true);
    expect(journalBalance([{ debit: 280 }, { credit: 279.99 }]).balanced).toBe(false);
    expect(journalBalance([]).balanced).toBe(false);
  });

  it('places outstanding balances into the correct aging band', () => {
    const asOf = new Date('2026-08-28T12:00:00Z');
    expect(receivableAge('2026-09-01', asOf)).toBe('current');
    expect(receivableAge('2026-08-01', asOf)).toBe('1-30');
    expect(receivableAge('2026-06-01', asOf)).toBe('61-90');
    expect(receivableAge('2026-05-01', asOf)).toBe('90+');
  });

  it('allocates shared shipping costs without losing rounding pennies', () => {
    const result = allocateSharedCost(100, [1, 1, 1]);
    expect(result).toEqual([33.33, 33.33, 33.34]);
    expect(result.reduce((sum, value) => sum + value, 0)).toBe(100);
  });
});

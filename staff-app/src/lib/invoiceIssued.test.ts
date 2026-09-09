import { describe, expect, it } from 'vitest';
import { hasIssuedInvoice, invoicePrefill, isIssued, prefillLineCount } from './invoice';
import { statusChoices } from './shipment';

const shipment = (invoice: any, extra: any = {}) =>
  ({ id: 'x', metadata: { invoice, ...extra } } as any);

describe('isIssued', () => {
  it('treats a booking-priced invoice with no number as not issued', () => {
    // What a booking writes now: lines and a currency, no number.
    expect(isIssued({
      items: [{ description: 'Drum', quantity: 2, unitPrice: 360 }],
      currency: 'GBP',
      paymentTerms: 'Pay on Arrival',
    })).toBe(false);
  });

  it('treats every invoice raised before the split as issued', () => {
    // All 77 live invoices look like this: a number, no issuedAt. They must
    // keep counting, or invoices already with customers vanish.
    expect(isIssued({
      invoiceNumber: 'INV-JAC09260020',
      issueDate: '2026-09-08',
      items: [{ description: 'Drum', quantity: 2, unitPrice: 360 }],
    })).toBe(true);
  });

  it('does not count a deleted invoice', () => {
    expect(isIssued({ invoiceNumber: 'INV-1', deletedAt: '2026-09-01T00:00:00Z' })).toBe(false);
  });

  it('ignores whitespace-only and missing numbers', () => {
    expect(isIssued({ invoiceNumber: '   ' })).toBe(false);
    expect(isIssued({})).toBe(false);
    expect(isIssued(null)).toBe(false);
    expect(isIssued(undefined)).toBe(false);
  });

  it('reads through the shipment', () => {
    expect(hasIssuedInvoice(shipment({ invoiceNumber: 'INV-2' }))).toBe(true);
    expect(hasIssuedInvoice(shipment({ items: [] }))).toBe(false);
    expect(hasIssuedInvoice({ id: 'y', metadata: {} } as any)).toBe(false);
  });
});

describe('invoicePrefill', () => {
  it('carries the booking lines through so Create opens filled in', () => {
    const prefill = invoicePrefill(shipment({
      items: [{ description: 'Drum', quantity: 2, unitPrice: 360 }],
      currency: 'EUR',
      paymentTerms: 'Pay on Arrival',
    }));
    expect(prefill.items).toHaveLength(1);
    expect(prefill.currency).toBe('EUR');
    expect(prefill.paymentTerms).toBe('Pay on Arrival');
  });

  it('never produces undefined collections a totals function would choke on', () => {
    const prefill = invoicePrefill(shipment({}));
    expect(prefill.items).toEqual([]);
    expect(prefill.payments).toEqual([]);
    expect(prefill.discount).toBe(0);
    expect(prefill.taxRate).toBe(0);
  });

  it('falls back to euros for an Irish sender when nothing priced it', () => {
    const s = { id: 'x', metadata: { sender: { country: 'Ireland' } } } as any;
    expect(invoicePrefill(s).currency).toBe('EUR');
  });

  it('defaults to sterling otherwise', () => {
    const s = { id: 'x', metadata: { sender: { country: 'England' } } } as any;
    expect(invoicePrefill(s).currency).toBe('GBP');
  });
});

describe('statusChoices', () => {
  it('offers the stages configuration has drifted away from', () => {
    // These three are live on real shipments but absent from
    // app_configuration.shipmentStatusOptions, which is why the old hardcoded
    // picker could not move work forward.
    const choices = statusChoices();
    for (const status of ['Booking Confirmed', 'At Warehouse', 'Enroute to Zimbabwe']) {
      expect(choices).toContain(status);
    }
  });

  it('always offers a status the rows in front of the user are already in', () => {
    expect(statusChoices(['Held at customs'])).toContain('Held at customs');
  });

  it('does not repeat a status differing only by case or padding', () => {
    const choices = statusChoices(['  collected ', 'COLLECTED', 'Collected']);
    expect(choices.filter((s) => s.toLowerCase().trim() === 'collected')).toHaveLength(1);
  });

  it('keeps the journey in order, so the picker reads top to bottom', () => {
    const choices = statusChoices();
    expect(choices.indexOf('Collected')).toBeLessThan(choices.indexOf('At Warehouse'));
    expect(choices.indexOf('At Warehouse')).toBeLessThan(choices.indexOf('Delivered'));
  });

  it('ignores blanks', () => {
    expect(statusChoices([null, undefined, '', '   '])).not.toContain('');
  });
});

describe('invoicePrefill from a website booking', () => {
  // A website booking writes no metadata.invoice at all; everything ordered
  // lives under metadata.items. This is the shape SimplifiedBookingForm writes.
  const websiteBooking = (extra: any = {}) => ({
    id: 'w',
    metadata: {
      sender: { country: 'England' },
      items: {
        drums: { quantity: 1, pricePerDrum: 280 },
        addOns: { doorToDoor: true, doorToDoorAddressCount: 1, doorToDoorPrice: 25, metalSeal: false },
      },
      pricing: { baseAmount: 305, finalAmount: 305, currency: 'GBP', paymentMethod: 'payOnArrival' },
      ...extra,
    },
  } as any);

  it('rebuilds the lines a website booking never wrote', () => {
    const items = invoicePrefill(websiteBooking()).items!;
    expect(items).toHaveLength(2);
    const total = items.reduce((sum, i) => sum + (i.quantity! * i.unitPrice!), 0);
    expect(total).toBe(305);
  });

  it('is no longer blocked as an empty invoice', () => {
    // This is the bug: the button was disabled telling staff to add items by
    // hand, on a booking that had already itemised everything.
    expect(prefillLineCount(websiteBooking())).toBe(2);
  });

  it('carries the pay-on-arrival premium as its own line', () => {
    const s = websiteBooking({
      pricing: { baseAmount: 305, finalAmount: 366, currency: 'GBP', paymentMethod: 'payOnArrival', payOnArrivalPremium: 61 },
    });
    const items = invoicePrefill(s).items!;
    expect(items.map((i) => i.description)).toContain('Pay on arrival premium');
    const total = items.reduce((sum, i) => sum + (i.quantity! * i.unitPrice!), 0);
    expect(total).toBe(366);
  });

  it('prices per address when several delivery addresses were booked', () => {
    const s = websiteBooking({
      items: {
        drums: { quantity: 2, pricePerDrum: 280 },
        addOns: { doorToDoor: true, doorToDoorAddressCount: 2, doorToDoorPrice: 50 },
      },
    });
    const line = invoicePrefill(s).items!.find((i) => /door delivery/.test(String(i.description)))!;
    expect(line.quantity).toBe(2);
    expect(line.unitPrice).toBe(25);
  });

  it('leaves an already itemised invoice alone', () => {
    const s = websiteBooking({ invoice: { items: [{ description: 'Agreed price', quantity: 1, unitPrice: 500 }] } });
    expect(invoicePrefill(s).items).toHaveLength(1);
    expect(invoicePrefill(s).items![0].unitPrice).toBe(500);
  });

  it('invents nothing when the booking priced nothing', () => {
    expect(prefillLineCount({ id: 'x', metadata: { items: {} } } as any)).toBe(0);
  });
});

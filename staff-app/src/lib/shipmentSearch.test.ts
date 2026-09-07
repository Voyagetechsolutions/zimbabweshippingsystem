import { describe, it, expect, vi } from 'vitest';

vi.mock('./supabase', () => ({ supabase: { from: () => ({}) } }));

import { matchesShipmentQuery } from './shipmentSearch';
import { customerRef, type Shipment } from './shipment';

// Shaped like the live rows: a tracking number, no stored customer_reference,
// and the sender details the computed reference is derived from.
const shipment = (over: Partial<Shipment> = {}): Shipment => ({
  id: 'ship-1',
  tracking_number: 'ZSN04189493',
  customer_reference: null,
  status: 'Booking Confirmed',
  created_at: '2026-09-03T14:27:40.891633+00:00',
  metadata: {
    sender: {
      firstName: 'Mark', lastName: 'Hudson',
      phone: '07365160013', email: 'mark@example.com',
      address: '41A North street', city: 'Rochford', country: 'England',
    },
    recipient: { name: 'Grace Hudson', phone: '+263771234567', city: 'Bulawayo' },
  },
  ...over,
} as Shipment);

describe('matchesShipmentQuery', () => {
  it('finds a shipment by its tracking number', () => {
    expect(matchesShipmentQuery(shipment(), 'ZSN04189493')).toBe(true);
    expect(matchesShipmentQuery(shipment(), 'zsn0418')).toBe(true);
  });

  it('finds a shipment by the reference shown on screen, which is computed', () => {
    // The bug this covers: 59 of 60 live shipments have no stored
    // customer_reference, so searching that column alone finds nothing while
    // the reference is right there in the list.
    const s = shipment();
    const shown = customerRef(s);
    expect(s.customer_reference).toBeNull();
    expect(shown).toMatch(/^[A-Z]{3}\d{8}$/);
    expect(matchesShipmentQuery(s, shown)).toBe(true);
  });

  it('ignores punctuation someone adds when typing a reference back', () => {
    const shown = customerRef(shipment());
    const spaced = `${shown.slice(0, 3)}-${shown.slice(3, 7)}-${shown.slice(7)}`;
    expect(matchesShipmentQuery(shipment(), spaced)).toBe(true);
  });

  it('still uses a stored reference when there is one', () => {
    const s = shipment({ customer_reference: 'MAR09266988' });
    expect(matchesShipmentQuery(s, 'MAR09266988')).toBe(true);
  });

  it('finds by sender name, phone, and the receiver', () => {
    expect(matchesShipmentQuery(shipment(), 'mark hudson')).toBe(true);
    expect(matchesShipmentQuery(shipment(), '07365160013')).toBe(true);
    expect(matchesShipmentQuery(shipment(), 'grace')).toBe(true);
    expect(matchesShipmentQuery(shipment(), 'bulawayo')).toBe(true);
  });

  it('narrows on every word rather than widening', () => {
    expect(matchesShipmentQuery(shipment(), 'mark rochford')).toBe(true);
    expect(matchesShipmentQuery(shipment(), 'mark glasgow')).toBe(false);
  });

  it('matches nothing on an empty or one-character query', () => {
    expect(matchesShipmentQuery(shipment(), '')).toBe(false);
    expect(matchesShipmentQuery(shipment(), '   ')).toBe(false);
  });

  it('does not match an unrelated shipment', () => {
    expect(matchesShipmentQuery(shipment(), 'ZSN99999999')).toBe(false);
    expect(matchesShipmentQuery(shipment(), 'nobesuthu')).toBe(false);
  });

  it('survives a shipment with almost no data on it', () => {
    const bare = { id: 'x', tracking_number: null, created_at: '2026-01-01T00:00:00Z' } as unknown as Shipment;
    expect(() => matchesShipmentQuery(bare, 'anything')).not.toThrow();
    expect(matchesShipmentQuery(bare, 'anything')).toBe(false);
  });
});

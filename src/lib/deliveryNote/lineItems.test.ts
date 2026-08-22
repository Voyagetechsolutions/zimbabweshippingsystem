import { describe, it, expect } from 'vitest';
import {
  buildDeliveryRow,
  countFromDescription,
  extractSealCodes,
  itemFingerprint,
  mapLineItems,
} from './lineItems';
import type { RawLineItem } from './types';

const row = (description: string, quantity = 1, amount = 100): RawLineItem => ({
  description_lines: description.split('\n'),
  quantity,
  rate: amount / (quantity || 1),
  amount,
});

describe('mapLineItems — money never reaches the manifest', () => {
  it('drops prices and keeps only goods columns', () => {
    const { rows } = mapLineItems([row('2x drums of clothing', 2, 560)]);
    expect(rows).toHaveLength(1);
    expect(Object.keys(rows[0])).not.toContain('amount');
    expect(rows[0]).toMatchObject({ item: 'DRUMS', qty: '2', uom: 'drum' });
  });

  it('drops collection fees, late-payment charges and discounts', () => {
    const { rows, dropped } = mapLineItems([
      row('1x drum household goods'),
      row('Collection fee'),
      row('20% added charges late payment'),
      row('Discount'),
    ]);
    expect(rows.map((r) => r.item)).toEqual(['DRUMS']);
    expect(dropped).toHaveLength(3);
    expect(dropped.join(' ')).toMatch(/collection fee/i);
  });
});

describe('mapLineItems — supplied drums', () => {
  it('folds a supplied drum into the drum it is, without a second row', () => {
    const { rows } = mapLineItems([row('1x drum of foodstuffs'), row('Drum supplied', 1, 25)]);
    expect(rows).toHaveLength(1);
    expect(rows[0].qty).toBe('1');
    expect(rows[0].description).toMatch(/\(drum supplied\)$/);
  });

  it('flags a supplied-drum charge with no drum to attach it to', () => {
    const { rows, flags } = mapLineItems([row('2x boxes'), row('Barrel supplied', 1, 25)]);
    expect(rows.map((r) => r.item)).toEqual(['BOXES']);
    expect(flags.some((f) => f.id === 'supplied-without-drum')).toBe(true);
  });
});

describe('mapLineItems — physical counts beat the Qty column', () => {
  it('uses the count written in the description', () => {
    const { rows } = mapLineItems([row('3x boxes of clothes', 1)]);
    expect(rows[0].qty).toBe('3');
    expect(rows[0].provenance).toMatch(/billed Qty 1/);
  });

  it('falls back to the Qty column when the description carries no count', () => {
    const { rows } = mapLineItems([row('Suitcase of personal effects', 2)]);
    expect(rows[0].qty).toBe('2');
  });
});

describe('mapLineItems — bundles', () => {
  it('splits a bundled priced line into one row per item type', () => {
    const { rows } = mapLineItems([row('Dining Table and 4 chairs', 1, 300)]);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ item: 'TABLE', qty: '1' });
    expect(rows[1]).toMatchObject({ item: 'CHAIRS', qty: '4', uom: 'chair' });
    expect(rows[1].provenance).toMatch(/Split out of/);
  });

  it('flags rather than splits when the segments are not recognisable items', () => {
    const { rows, flags } = mapLineItems([row('Assorted bric-a-brac and sundries', 1)]);
    expect(rows).toHaveLength(1);
    expect(flags.some((f) => f.id.startsWith('possible-bundle:'))).toBe(true);
  });
});

describe('mapLineItems — seals', () => {
  it('consolidates every seal row into exactly one row carrying the codes', () => {
    const { rows } = mapLineItems([
      row('1x drum'),
      row('Metal seal 2 x seals 884512, 884513', 2, 10),
    ]);
    const seals = rows.filter((r) => r.item === 'SEALS');
    expect(seals).toHaveLength(1);
    expect(seals[0].qty).toBe('2');
    expect(seals[0].description).toMatch(/884512/);
  });

  it('flags a seal count that disagrees with the codes listed', () => {
    const { flags, rows } = mapLineItems([row('Seals 3 supplied: 884512, 884513', 3, 15)]);
    // Neither number is silently chosen — the billed quantity stands and the
    // disagreement is put to the operator.
    expect(rows.find((r) => r.item === 'SEALS')?.qty).toBe('3');
    const flag = flags.find((f) => f.id === 'seal-count-mismatch');
    expect(flag?.detail).toMatch(/3 seal\(s\) but 2 code\(s\)/);
  });

  it('preserves a verbatim note like "own seal"', () => {
    const { rows, flags } = mapLineItems([row('Customer own seal, code not shown', 1)]);
    expect(rows.find((r) => r.item === 'SEALS')?.description).toMatch(/own seal, code not shown/);
    expect(flags.some((f) => f.id === 'seal-codes-missing')).toBe(false);
  });
});

describe('mapLineItems — duplicated rows', () => {
  it('flags a verbatim repeat instead of deduplicating or double counting', () => {
    const { rows, flags } = mapLineItems([row('1x drum of clothes'), row('1x drum of clothes')]);
    expect(rows).toHaveLength(2);
    const flag = flags.find((f) => f.id.startsWith('duplicate-line:'));
    expect(flag).toBeDefined();
    expect(flag?.severity).toBe('review');
  });
});

describe('mapLineItems — nothing to carry', () => {
  it('blocks when every row was a charge', () => {
    const { rows, flags } = mapLineItems([row('Collection fee'), row('Discount')]);
    expect(rows).toHaveLength(0);
    expect(flags.find((f) => f.id === 'no-goods-rows')?.severity).toBe('blocking');
  });
});

describe('buildDeliveryRow', () => {
  it('closes a door-to-door note with a trip', () => {
    expect(buildDeliveryRow('door_to_door', 'Bulawayo')).toEqual({
      item: 'DELIVERY',
      description: 'Door to door delivery, Bulawayo',
      qty: '',
      uom: 'trip',
    });
  });

  it('closes a self-collection note with no quantity and no unit', () => {
    expect(buildDeliveryRow('self_collection', 'Bulawayo')).toEqual({
      item: 'COLLECTION',
      description: 'Self collection, Bulawayo',
      qty: '',
      uom: '-',
    });
  });
});

describe('helpers', () => {
  it('reads seal codes and ignores counts and prose', () => {
    expect(extractSealCodes('2 x seals 884512, 884513')).toEqual(['884512', '884513']);
    expect(extractSealCodes('own seal')).toEqual([]);
  });

  it('reads a count from several description shapes', () => {
    expect(countFromDescription('3x boxes')).toBe(3);
    expect(countFromDescription('4 chairs')).toBe(4);
    expect(countFromDescription('bunch of 6 chairs')).toBe(6);
    expect(countFromDescription('a drum of clothes')).toBeNull();
  });

  it('fingerprints goods only, so the delivery row never changes identity', () => {
    const goods = [{ item: 'DRUMS', description: 'd', qty: '2', uom: 'drum' }];
    const withDelivery = [...goods, buildDeliveryRow('door_to_door', 'Harare')];
    expect(itemFingerprint(withDelivery)).toBe(itemFingerprint(goods));
  });
});

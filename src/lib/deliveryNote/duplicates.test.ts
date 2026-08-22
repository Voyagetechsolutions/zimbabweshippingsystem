import { describe, it, expect } from 'vitest';
import { classifyAgainstLedger, ledgerFlags } from './duplicates';
import type { LedgerRecord } from './types';

const record = (over: Partial<LedgerRecord> = {}): LedgerRecord => ({
  id: 'rec-1',
  reference: 'SIT04265328',
  invoice_number: '04265328',
  load_suffix: null,
  shipper_name: 'Sithokozile Ncube',
  recipient_name: 'Petunia Mlilo',
  recipient_city: 'Bulawayo',
  item_fingerprint: 'drums:2|seals:1',
  paid: true,
  created_at: '2026-08-01T00:00:00Z',
  ...over,
});

const candidate = {
  reference: 'SIT04265328',
  invoiceNumber: '04265328',
  recipientName: 'Petunia Mlilo',
  recipientCity: 'Bulawayo',
  itemFingerprint: 'drums:2|seals:1',
};

describe('classifyAgainstLedger', () => {
  it('finds nothing when the invoice number is new', () => {
    const result = classifyAgainstLedger(candidate, [record({ invoice_number: '04265999', reference: 'NOM04265999' })]);
    expect(result.matches).toHaveLength(0);
  });

  it('calls an identical ref, recipient and item set a duplicate', () => {
    const result = classifyAgainstLedger(candidate, [record()]);
    expect(result.duplicates).toHaveLength(1);
    expect(result.multiLoads).toHaveLength(0);
  });

  it('ignores case and spacing when comparing', () => {
    const result = classifyAgainstLedger(
      { ...candidate, recipientName: '  petunia   MLILO ' },
      [record()],
    );
    expect(result.duplicates).toHaveLength(1);
  });

  it('calls a different recipient on the same invoice a second load', () => {
    const result = classifyAgainstLedger(
      { ...candidate, recipientName: 'Thandiwe Sibanda' },
      [record()],
    );
    expect(result.multiLoads).toHaveLength(1);
    expect(result.multiLoads[0].reason).toMatch(/recipient/);
  });

  it('calls a different destination city a second load', () => {
    const result = classifyAgainstLedger({ ...candidate, recipientCity: 'Harare' }, [record()]);
    expect(result.multiLoads[0].reason).toMatch(/destination/);
  });

  it('calls a different item list a second load', () => {
    const result = classifyAgainstLedger({ ...candidate, itemFingerprint: 'boxes:5' }, [record()]);
    expect(result.multiLoads[0].reason).toMatch(/item list/);
  });
});

describe('ledgerFlags', () => {
  it('requires an explicit acknowledgement before regenerating a duplicate', () => {
    const flags = ledgerFlags(classifyAgainstLedger(candidate, [record()]), '');
    expect(flags).toHaveLength(1);
    expect(flags[0].severity).toBe('review');
    expect(flags[0].detail).toMatch(/lost file/);
  });

  it('blocks a second load until a suffix is assigned', () => {
    const classification = classifyAgainstLedger({ ...candidate, recipientCity: 'Harare' }, [record()]);
    const flags = ledgerFlags(classification, '');
    expect(flags[0].id).toBe('multi-load-suffix-required');
    expect(flags[0].severity).toBe('blocking');
  });

  it('clears once a suffix is assigned', () => {
    const classification = classifyAgainstLedger({ ...candidate, recipientCity: 'Harare' }, [record()]);
    expect(ledgerFlags(classification, 'B')).toHaveLength(0);
  });

  it('blocks a suffix that is already on the books', () => {
    const classification = classifyAgainstLedger(
      { ...candidate, recipientCity: 'Harare' },
      [record({ load_suffix: 'B', reference: 'SIT04265328B' })],
    );
    const flags = ledgerFlags(classification, 'b');
    expect(flags.some((f) => f.id === 'suffix-taken:B' && f.severity === 'blocking')).toBe(true);
  });

  it('never lets two real loads share one reference silently', () => {
    // Two different shipments, one invoice number: with no suffix the pipeline
    // must be blocked, not merely warned.
    const classification = classifyAgainstLedger(
      { ...candidate, recipientName: 'Thandiwe Sibanda', recipientCity: 'Gweru', itemFingerprint: 'boxes:4' },
      [record()],
    );
    expect(ledgerFlags(classification, '').some((f) => f.severity === 'blocking')).toBe(true);
  });
});

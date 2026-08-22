import { describe, it, expect } from 'vitest';
import { canGenerate, computeDeliveryNote, evaluateDraft } from './compute';
import type { InvoiceExtraction, LedgerRecord, RecipientInput } from './types';

const extraction = (over: Partial<InvoiceExtraction> = {}): InvoiceExtraction => ({
  invoice_number: '04265328',
  invoice_date: '2026-07-14',
  due_date: '2026-07-28',
  bill_to_raw: '5328 Sithokozile Ncube\n14 Marsh Lane\nLeeds LS9',
  shipper_phone_raw: '07700 905328',
  deliver_to_raw: '',
  line_items: [
    { description_lines: ['2x drums of household goods'], quantity: 2, rate: 280, amount: 560 },
    { description_lines: ['Metal seals 2 x', '884512, 884513'], quantity: 2, rate: 5, amount: 10 },
    { description_lines: ['Collection fee'], quantity: 1, rate: 25, amount: 25 },
  ],
  subtotal: 595,
  discount: null,
  total: 595,
  paid_amount: 595,
  balance_due: 0,
  red_paid_stamp_visible: true,
  extraction_confidence_notes: '',
  ...over,
});

const recipient: RecipientInput = {
  name: 'Petunia Mlilo',
  phone: '0772 123 456',
  address: '12 Dollar Avenue\nSauerstown',
  city: 'Bulawayo',
};

const ledgerRecord = (over: Partial<LedgerRecord> = {}): LedgerRecord => ({
  id: 'rec-1',
  reference: 'SIT04265328',
  invoice_number: '04265328',
  load_suffix: null,
  shipper_name: 'Sithokozile Ncube',
  recipient_name: 'Petunia Mlilo',
  recipient_city: 'Bulawayo',
  item_fingerprint: 'drums:2|seals:2',
  paid: true,
  created_at: '2026-08-01T00:00:00Z',
  ...over,
});

describe('computeDeliveryNote — the clean case', () => {
  it('produces a complete, unflagged note from a clean invoice with a recipient', () => {
    const { draft, flags } = computeDeliveryNote({ extraction: extraction(), recipient });

    expect(draft.reference).toBe('SIT04265328');
    expect(draft.shipper.name).toBe('Sithokozile Ncube');
    expect(draft.shipper.phone).toBe('+44 7700 905328');
    expect(draft.recipient.phone).toBe('+263 772 123 456');
    expect(draft.paid).toBe(true);
    expect(draft.rows.map((r) => r.item)).toEqual(['DRUMS', 'SEALS', 'DELIVERY']);
    expect(draft.rows.at(-1)).toMatchObject({
      description: 'Door to door delivery, Bulawayo',
      uom: 'trip',
    });
    expect(draft.dropped.join(' ')).toMatch(/Collection fee/);
    expect(flags).toEqual([]);
    expect(canGenerate(flags, new Set())).toBe(true);
  });

  it('closes a self-collection note with a COLLECTION row', () => {
    const { draft } = computeDeliveryNote({
      extraction: extraction(),
      recipient,
      deliveryMode: 'self_collection',
    });
    expect(draft.rows.at(-1)).toMatchObject({ item: 'COLLECTION', qty: '', uom: '-' });
  });
});

describe('computeDeliveryNote — no recipient', () => {
  it('blocks generation and asks for the recipient rather than guessing one', () => {
    const { draft, flags } = computeDeliveryNote({ extraction: extraction() });
    const recipientFlag = flags.find((f) => f.id === 'recipient-needed');

    expect(recipientFlag?.severity).toBe('blocking');
    expect(draft.recipient.name).toBe('');
    // Acknowledging cannot unblock it — the field has to be filled in.
    expect(canGenerate(flags, new Set(flags.map((f) => f.id)))).toBe(false);
  });

  it('unblocks once the recipient is entered', () => {
    const { draft, evaluation } = computeDeliveryNote({ extraction: extraction() });
    const fixed = {
      ...draft,
      recipient: { ...recipient, address: recipient.address },
      rows: draft.rows.map((row) =>
        row.item === 'DELIVERY' ? { ...row, description: 'Door to door delivery, Bulawayo' } : row,
      ),
    };
    expect(evaluateDraft(fixed, evaluation).some((f) => f.severity === 'blocking')).toBe(false);
  });
});

describe('computeDeliveryNote — a receiver printed on the invoice', () => {
  const printed = extraction({
    deliver_to_raw: 'Deliver to: Thandiwe Sibanda, 8 Fife Street, Gweru',
  });

  it('prefills the recipient from the invoice instead of making the admin retype it', () => {
    const { draft } = computeDeliveryNote({ extraction: printed });
    expect(draft.recipient).toMatchObject({
      name: 'Thandiwe Sibanda',
      address: '8 Fife Street',
      city: 'Gweru',
    });
    expect(draft.rows.at(-1)?.description).toBe('Door to door delivery, Gweru');
  });

  it('does not block, because nothing is missing any more', () => {
    const { flags } = computeDeliveryNote({ extraction: printed });
    expect(flags.some((f) => f.severity === 'blocking')).toBe(false);
  });

  it('still asks a human to confirm it is the consignee and not the payer', () => {
    const { flags } = computeDeliveryNote({ extraction: printed });
    const flag = flags.find((f) => f.id === 'recipient-from-invoice');
    expect(flag?.severity).toBe('review');
    expect(canGenerate(flags, new Set())).toBe(false);
    expect(canGenerate(flags, new Set(flags.map((f) => f.id)))).toBe(true);
  });

  it('drops the confirmation once the operator edits the name themselves', () => {
    const { draft, evaluation } = computeDeliveryNote({ extraction: printed });
    const edited = { ...draft, recipient: { ...draft.recipient, name: 'T. Sibanda (aunt)' } };
    expect(evaluateDraft(edited, evaluation).some((f) => f.id === 'recipient-from-invoice')).toBe(false);
  });

  it('surfaces a half-read receiver block rather than filing it', () => {
    const { flags } = computeDeliveryNote({
      extraction: extraction({ deliver_to_raw: 'Receiver: Thandiwe Sibanda' }),
    });
    // No address and no city, so the blocking recipient-needed rule still bites.
    expect(flags.find((f) => f.id === 'recipient-needed')?.severity).toBe('blocking');
    expect(flags.some((f) => f.id.startsWith('printed-recipient-problem:'))).toBe(true);
  });

  it('lets a separately supplied receiver win, but says the invoice disagreed', () => {
    const { draft, flags } = computeDeliveryNote({ extraction: printed, recipient });
    expect(draft.recipient.name).toBe('Petunia Mlilo');
    expect(draft.recipient.city).toBe('Bulawayo');
    const conflict = flags.find((f) => f.id.startsWith('recipient-conflict:'));
    expect(conflict?.detail).toMatch(/Thandiwe Sibanda/);
    expect(conflict?.detail).toMatch(/Petunia Mlilo/);
  });

  it('treats an empty deliver_to_raw as no receiver at all', () => {
    const { flags } = computeDeliveryNote({ extraction: extraction({ deliver_to_raw: '   ' }) });
    expect(flags.find((f) => f.id === 'recipient-needed')?.severity).toBe('blocking');
    expect(flags.some((f) => f.id === 'recipient-from-invoice')).toBe(false);
  });
});

describe('computeDeliveryNote — phone sanity check', () => {
  it('flags a phone whose last four do not match the invoice number', () => {
    const { flags } = computeDeliveryNote({
      extraction: extraction({ shipper_phone_raw: '07700 901234' }),
      recipient,
    });
    const flag = flags.find((f) => f.id.startsWith('phone-mismatch:'));
    expect(flag).toBeDefined();
    expect(flag?.detail).toMatch(/ends 5328/);
    expect(flag?.detail).toMatch(/ends 1234/);
  });

  it('does not alter the invoice number to make the check pass', () => {
    const { draft } = computeDeliveryNote({
      extraction: extraction({ shipper_phone_raw: '07700 901234' }),
      recipient,
    });
    expect(draft.invoiceNumber).toBe('04265328');
    expect(draft.reference).toBe('SIT04265328');
  });

  it('clears once the phone is corrected in the draft', () => {
    const { draft, evaluation } = computeDeliveryNote({
      extraction: extraction({ shipper_phone_raw: '07700 901234' }),
      recipient,
    });
    const fixed = { ...draft, shipper: { ...draft.shipper, phone: '+44 7700 905328' } };
    expect(evaluateDraft(fixed, evaluation).some((f) => f.id.startsWith('phone-mismatch:'))).toBe(false);
  });
});

describe('computeDeliveryNote — ambiguous names', () => {
  it('routes an initials-only shipper to review instead of taking three letters', () => {
    const { flags } = computeDeliveryNote({
      extraction: extraction({ bill_to_raw: '5328 SN Ndebele\n14 Marsh Lane' }),
      recipient,
    });
    expect(flags.some((f) => f.field === 'shipper.name')).toBe(true);
  });

  it('clears the ambiguity when the operator types the real name', () => {
    const { draft, evaluation } = computeDeliveryNote({
      extraction: extraction({ bill_to_raw: '5328 SN Ndebele\n14 Marsh Lane' }),
      recipient,
    });
    const fixed = { ...draft, shipper: { ...draft.shipper, name: 'Sipho Ndebele' } };
    expect(evaluateDraft(fixed, evaluation).some((f) => f.field === 'shipper.name')).toBe(false);
  });
});

describe('computeDeliveryNote — extraction notes', () => {
  it('always routes a non-empty confidence note to review', () => {
    const { flags } = computeDeliveryNote({
      extraction: extraction({ extraction_confidence_notes: 'The Bill To line was cut off at the edge.' }),
      recipient,
    });
    const flag = flags.find((f) => f.id === 'extraction-notes');
    expect(flag?.detail).toMatch(/cut off/);
    expect(canGenerate(flags, new Set())).toBe(false);
    expect(canGenerate(flags, new Set(['extraction-notes']))).toBe(true);
  });
});

describe('computeDeliveryNote — paid', () => {
  it('carries an unpaid hold through as a flag on the note', () => {
    const { draft, flags } = computeDeliveryNote({
      extraction: extraction({ balance_due: 0.7, red_paid_stamp_visible: false }),
      recipient,
    });
    expect(draft.paid).toBe(false);
    expect(flags.some((f) => f.id === 'unpaid-hold')).toBe(true);
  });

  it('blocks a hand-set stamp that contradicts the balance', () => {
    const { draft, evaluation } = computeDeliveryNote({
      extraction: extraction({ balance_due: 12.5, red_paid_stamp_visible: false }),
      recipient,
    });
    const flags = evaluateDraft({ ...draft, paid: true }, evaluation);
    expect(flags.find((f) => f.id === 'stamp-contradicts-balance')?.severity).toBe('blocking');
  });
});

describe('computeDeliveryNote — destination conflicts', () => {
  it('lets the separately supplied recipient win but flags the disagreement', () => {
    const { draft, flags } = computeDeliveryNote({
      extraction: extraction({
        line_items: [
          { description_lines: ['2x drums of household goods'], quantity: 2, rate: 280, amount: 560 },
          { description_lines: ['Door to door delivery to Harare'], quantity: 1, rate: 40, amount: 40 },
        ],
      }),
      recipient,
    });
    expect(draft.rows.at(-1)?.description).toBe('Door to door delivery, Bulawayo');
    expect(flags.some((f) => f.id.startsWith('city-conflict:'))).toBe(true);
  });
});

describe('computeDeliveryNote — ledger', () => {
  it('surfaces a re-upload of a completed invoice as a likely duplicate', () => {
    const { flags } = computeDeliveryNote({
      extraction: extraction(),
      recipient,
      ledger: [ledgerRecord()],
    });
    expect(flags.some((f) => f.id.startsWith('duplicate-note:'))).toBe(true);
  });

  it('blocks a second load on the same invoice until a suffix is chosen', () => {
    const { draft, flags, evaluation } = computeDeliveryNote({
      extraction: extraction(),
      recipient: { ...recipient, name: 'Thandiwe Sibanda', city: 'Gweru' },
      ledger: [ledgerRecord()],
    });
    expect(flags.find((f) => f.id === 'multi-load-suffix-required')?.severity).toBe('blocking');

    const suffixed = { ...draft, loadSuffix: 'B' };
    expect(
      evaluateDraft(suffixed, evaluation).some((f) => f.id === 'multi-load-suffix-required'),
    ).toBe(false);
  });
});

describe('canGenerate', () => {
  it('needs every review flag acknowledged and no blocking flag left', () => {
    const review = { id: 'a', field: 'x', severity: 'review' as const, title: 't', detail: 'd' };
    const blocking = { id: 'b', field: 'y', severity: 'blocking' as const, title: 't', detail: 'd' };
    expect(canGenerate([], new Set())).toBe(true);
    expect(canGenerate([review], new Set())).toBe(false);
    expect(canGenerate([review], new Set(['a']))).toBe(true);
    expect(canGenerate([blocking], new Set(['b']))).toBe(false);
  });
});

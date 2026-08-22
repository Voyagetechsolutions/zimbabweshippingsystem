import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import DeliveryNoteDocument from './DeliveryNoteDocument';
import { buildDeliveryRow } from '@/lib/deliveryNote/lineItems';
import type { DeliveryNoteDraft } from '@/lib/deliveryNote/types';

// jsdom has no canvas, so the logo loader would fail noisily; the note has to
// print with or without it, which is the behaviour under test elsewhere.
vi.mock('@/lib/deliveryNote/logo', () => ({ loadLogoDataUri: () => Promise.resolve('') }));

const draft = (over: Partial<DeliveryNoteDraft> = {}): DeliveryNoteDraft => ({
  reference: 'SIT04265328',
  invoiceNumber: '04265328',
  loadSuffix: '',
  date: '2026-07-14',
  shipper: {
    name: 'Sithokozile Ncube',
    phone: '+447700905328',
    address: '14 Marsh Lane\nLeeds LS9',
    city: '',
  },
  recipient: {
    name: 'Petunia Mlilo',
    phone: '+263772123456',
    address: '12 Dollar Avenue\nSauerstown',
    city: 'Bulawayo',
  },
  rows: [
    { item: 'DRUMS', description: '2x drums of household goods', qty: '2', uom: 'drum' },
    { item: 'SEALS', description: '884512, 884513', qty: '2', uom: 'seal' },
    buildDeliveryRow('door_to_door', 'Bulawayo'),
  ],
  deliveryMode: 'door_to_door',
  paid: true,
  balanceDue: 0,
  dropped: [],
  ...over,
});

describe('DeliveryNoteDocument', () => {
  it('prints the house header and reference', () => {
    render(<DeliveryNoteDocument draft={draft()} />);
    expect(screen.getByRole('heading', { name: 'DELIVERY NOTE' })).toBeInTheDocument();
    expect(screen.getByText('Delivery Note #: SIT04265328')).toBeInTheDocument();
  });

  it('uses the agreed column set, in order', () => {
    render(<DeliveryNoteDocument draft={draft()} />);
    const headers = screen.getAllByRole('columnheader').map((th) => th.textContent);
    expect(headers).toEqual(['#', 'Item', 'Description', 'Qty', 'UOM']);
  });

  it('carries no prices anywhere on the page', () => {
    const { container } = render(<DeliveryNoteDocument draft={draft()} />);
    expect(container.textContent).not.toMatch(/[£$€]/);
    expect(container.textContent).not.toMatch(/\b\d+\.\d{2}\b/);
  });

  it('closes with the delivery row, numbered last', () => {
    render(<DeliveryNoteDocument draft={draft()} />);
    const rows = screen.getAllByRole('row').slice(1); // drop the header row
    const last = within(rows.at(-1)!).getAllByRole('cell').map((td) => td.textContent);
    expect(last).toEqual(['3', 'DELIVERY', 'Door to door delivery, Bulawayo', '', 'trip']);
  });

  it('shows both parties with the name first', () => {
    render(<DeliveryNoteDocument draft={draft()} />);
    expect(screen.getByText('SHIPPER')).toBeInTheDocument();
    expect(screen.getByText('RECIPIENT')).toBeInTheDocument();
    expect(screen.getByText('Sithokozile Ncube')).toBeInTheDocument();
    expect(screen.getByText('12 Dollar Avenue')).toBeInTheDocument();
  });

  it('stamps PAID only when the note is paid', () => {
    const { rerender } = render(<DeliveryNoteDocument draft={draft({ paid: true })} />);
    expect(screen.getByText('PAID')).toBeInTheDocument();

    rerender(<DeliveryNoteDocument draft={draft({ paid: false })} />);
    expect(screen.queryByText('PAID')).not.toBeInTheDocument();
  });

  it('footers the house name and the source invoice', () => {
    render(<DeliveryNoteDocument draft={draft()} />);
    expect(screen.getByText('Zimbabwe Shipping / Tshakmo Removals')).toBeInTheDocument();
    expect(screen.getByText('Invoice: 04265328')).toBeInTheDocument();
  });

  it('keeps one fixed-width page whether the manifest is short or long', () => {
    const short = render(<DeliveryNoteDocument draft={draft({ rows: draft().rows.slice(1) })} />);
    const shortWidth = (short.container.firstChild as HTMLElement).style.width;
    short.unmount();

    const longRows = [
      ...Array.from({ length: 7 }, (_, i) => ({
        item: 'BOXES',
        description: `Box ${i + 1} of clothing and shoes`,
        qty: '1',
        uom: 'box',
      })),
      buildDeliveryRow('self_collection', 'Harare'),
    ];
    const long = render(<DeliveryNoteDocument draft={draft({ rows: longRows })} />);
    expect((long.container.firstChild as HTMLElement).style.width).toBe(shortWidth);
    expect(screen.getAllByRole('row')).toHaveLength(longRows.length + 1);
  });
});

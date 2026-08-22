import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import ExtractionSummary from './ExtractionSummary';
import type { InvoiceExtraction } from '@/lib/deliveryNote/types';

const extraction = (over: Partial<InvoiceExtraction> = {}): InvoiceExtraction => ({
  invoice_number: '04265328',
  invoice_date: '14/07/2026',
  due_date: '28/07/2026',
  bill_to_raw: '5328 Sithokozile Ncube\n14 Marsh Lane',
  shipper_phone_raw: '07700 905328',
  deliver_to_raw: '',
  line_items: [
    { description_lines: ['2x drums of', 'household goods'], quantity: 2, rate: 280, amount: 560 },
    { description_lines: ['Collection fee'], quantity: 1, rate: 25, amount: 25 },
  ],
  subtotal: 585,
  discount: null,
  total: 585,
  paid_amount: 585,
  balance_due: 0,
  red_paid_stamp_visible: true,
  extraction_confidence_notes: '',
  ...over,
});

/** Field label -> value, as the operator would read it off the panel. */
function readFacts() {
  const terms = screen.getAllByRole('term');
  return Object.fromEntries(
    terms.map((dt) => [dt.textContent, dt.nextElementSibling?.textContent]),
  );
}

describe('ExtractionSummary', () => {
  it('shows every transcribed money field, including the ones the note never prints', () => {
    render(<ExtractionSummary extraction={extraction()} />);
    expect(readFacts()).toMatchObject({
      'Invoice date': '14/07/2026',
      'Due date': '28/07/2026',
      Subtotal: '585.00',
      Total: '585.00',
      Paid: '585.00',
      'Balance due': '0.00',
      'Red PAID stamp': 'visible',
    });
  });

  it('distinguishes an unread figure from a zero', () => {
    render(<ExtractionSummary extraction={extraction({ discount: null, balance_due: 0 })} />);
    const facts = readFacts();
    expect(facts.Discount).toBe('—');
    expect(facts['Balance due']).toBe('0.00');
  });

  it('says when no red stamp was seen', () => {
    render(<ExtractionSummary extraction={extraction({ red_paid_stamp_visible: false })} />);
    expect(readFacts()['Red PAID stamp']).toBe('not visible');
  });

  it('shows the Bill To block verbatim, newlines intact', () => {
    render(<ExtractionSummary extraction={extraction()} />);
    expect(screen.getByText(/5328 Sithokozile Ncube/).textContent)
      .toBe('5328 Sithokozile Ncube\n14 Marsh Lane');
  });

  it('lists every printed row with its price columns, including dropped charges', () => {
    render(<ExtractionSummary extraction={extraction()} />);
    const rows = screen.getAllByRole('row').slice(1);
    expect(rows).toHaveLength(2);

    // A wrapped description is rejoined for display, in printed order.
    expect(within(rows[0]).getAllByRole('cell').map((c) => c.textContent))
      .toEqual(['2x drums of household goods', '2', '280', '560']);

    // The collection fee is off the manifest but still visible here, so the
    // operator can see what the rules dropped and why.
    expect(within(rows[1]).getAllByRole('cell')[0].textContent).toBe('Collection fee');
  });

  it('renders an unreadable price column as a dash rather than a zero', () => {
    render(<ExtractionSummary extraction={extraction({
      line_items: [{ description_lines: ['Smudged row'], quantity: null, rate: null, amount: null }],
    })} />);
    expect(within(screen.getAllByRole('row')[1]).getAllByRole('cell').map((c) => c.textContent))
      .toEqual(['Smudged row', '—', '—', '—']);
  });

  it('says plainly when the invoice named no receiver', () => {
    render(<ExtractionSummary extraction={extraction()} />);
    expect(screen.getByText(/the invoice names no receiver/i)).toBeInTheDocument();
  });

  it('shows a printed receiver block verbatim when there is one', () => {
    const block = 'Deliver to: Thandiwe Sibanda\n8 Fife Street, Gweru';
    render(<ExtractionSummary extraction={extraction({ deliver_to_raw: block })} />);
    expect(screen.getByText(/Thandiwe Sibanda/).textContent).toBe(block);
    expect(screen.queryByText(/names no receiver/i)).not.toBeInTheDocument();
  });

  it('keeps the printed rows in a scroll container so a phone never scrolls sideways', () => {
    const { container } = render(<ExtractionSummary extraction={extraction()} />);
    expect(container.querySelector('table')?.parentElement?.className).toContain('overflow-x-auto');
  });
});

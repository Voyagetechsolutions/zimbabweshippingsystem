import React from 'react';
import type { InvoiceExtraction } from '@/lib/deliveryNote/types';

// The rest of the transcription: the fields the rules were applied to that do
// not themselves print on a goods manifest.
//
// Read-only on purpose. Editing a subtotal would change nothing downstream, and
// an editable field that does nothing is worse than a visible one that does
// not. The fields that DO change the note — balance due, the rows, both
// parties — are editable in the form above this.

interface Props {
  extraction: InvoiceExtraction;
}

const money = (value: number | null): string => (value === null ? '—' : value.toFixed(2));

const ExtractionSummary: React.FC<Props> = ({ extraction }) => {
  const facts: Array<[string, string]> = [
    ['Invoice date', extraction.invoice_date || '—'],
    ['Due date', extraction.due_date || '—'],
    ['Subtotal', money(extraction.subtotal)],
    ['Discount', money(extraction.discount)],
    ['Total', money(extraction.total)],
    ['Paid', money(extraction.paid_amount)],
    ['Balance due', money(extraction.balance_due)],
    ['Red PAID stamp', extraction.red_paid_stamp_visible ? 'visible' : 'not visible'],
  ];

  return (
    <details className="rounded-lg border p-3">
      <summary className="text-xs font-semibold uppercase tracking-wide text-muted-foreground cursor-pointer">
        As printed on the invoice
      </summary>

      <div className="mt-3 space-y-3">
        <dl className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-2 text-xs">
          {facts.map(([label, value]) => (
            <div key={label}>
              <dt className="text-muted-foreground">{label}</dt>
              <dd className="font-medium">{value}</dd>
            </div>
          ))}
        </dl>

        {extraction.bill_to_raw && (
          <div className="text-xs">
            <div className="text-muted-foreground mb-1">Bill To block, verbatim</div>
            <pre className="whitespace-pre-wrap font-mono text-[11px] bg-muted/40 rounded p-2">
              {extraction.bill_to_raw}
            </pre>
          </div>
        )}

        {/* Most invoices print no consignee, so say so explicitly rather than
            hiding the row — "the invoice named nobody" is itself the answer the
            operator needs before typing a receiver in. */}
        <div className="text-xs">
          <div className="text-muted-foreground mb-1">Receiver printed on the invoice</div>
          {extraction.deliver_to_raw ? (
            <pre className="whitespace-pre-wrap font-mono text-[11px] bg-muted/40 rounded p-2">
              {extraction.deliver_to_raw}
            </pre>
          ) : (
            <p className="italic text-muted-foreground">
              None — the invoice names no receiver, which is normal. Enter one above.
            </p>
          )}
        </div>

        {extraction.line_items.length > 0 && (
          // Wide content scrolls inside its own box rather than pushing the
          // dialog sideways on a phone.
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-muted-foreground text-left">
                  <th className="py-1 pr-2 font-medium">Printed row</th>
                  <th className="py-1 pr-2 font-medium w-14">Qty</th>
                  <th className="py-1 pr-2 font-medium w-16">Rate</th>
                  <th className="py-1 font-medium w-16">Amount</th>
                </tr>
              </thead>
              <tbody>
                {extraction.line_items.map((row, index) => (
                  <tr key={index} className="border-t">
                    <td className="py-1 pr-2">{row.description_lines.join(' ')}</td>
                    <td className="py-1 pr-2">{row.quantity ?? '—'}</td>
                    <td className="py-1 pr-2">{row.rate ?? '—'}</td>
                    <td className="py-1">{row.amount ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </details>
  );
};

export default ExtractionSummary;

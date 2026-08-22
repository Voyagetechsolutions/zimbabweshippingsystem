import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { format } from 'date-fns';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Download, FileText, Loader2, Plus, Printer, ScanLine, Trash2,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { extractInvoice } from '@/lib/invoiceVision';
import {
  buildDeliveryRow,
  canGenerate,
  computeDeliveryNote,
  deriveReference,
  evaluateDraft,
  findLedgerMatches,
  parseBillTo,
  parseRecipientText,
  recordIssuedNote,
  resolvePaidStatus,
  type DeliveryMode,
  type DeliveryNoteDraft,
  type EvaluationContext,
  type InvoiceExtraction,
  type LedgerRecord,
  type NoteRow,
} from '@/lib/deliveryNote';
import { downloadNotePdf, printNote } from '@/lib/deliveryNote/pdf';
import DeliveryNoteDocument from './DeliveryNoteDocument';
import ReviewFlags from './ReviewFlags';
import ExtractionSummary from './ExtractionSummary';

// Upload an invoice, review what the rules made of it, then generate.
//
// The order is deliberate and the gate is real: extraction and the rules engine
// produce a draft plus a list of flags, and no PDF exists and nothing reaches
// the register until every flag is either fixed in the form or explicitly
// acknowledged. A wrong note that shipped because a low-confidence field
// resolved itself is worse than the manual process this replaces.

interface Props {
  isOpen: boolean;
  onClose: () => void;
  /** Set when the note is being raised against a booking in this system. */
  shipmentId?: string | null;
  /** Prefills the recipient from a booking, which beats the invoice. */
  initialRecipient?: { name: string; phone: string; address: string; city: string } | null;
  onIssued?: () => void;
}

const EMPTY_EXTRACTION: InvoiceExtraction = {
  invoice_number: '',
  invoice_date: '',
  due_date: '',
  bill_to_raw: '',
  shipper_phone_raw: '',
  deliver_to_raw: '',
  line_items: [],
  subtotal: null,
  discount: null,
  total: null,
  paid_amount: null,
  balance_due: null,
  red_paid_stamp_visible: false,
  extraction_confidence_notes: '',
};

/** Amber for a judgement call, red for something that has to change. */
function fieldClass(fields: Map<string, 'blocking' | 'review'>, name: string): string {
  const severity = fields.get(name);
  if (severity === 'blocking') return 'border-red-500 ring-1 ring-red-300';
  if (severity === 'review') return 'border-amber-500 ring-1 ring-amber-300';
  return '';
}

const InvoiceNoteWizard: React.FC<Props> = ({
  isOpen, onClose, shipmentId, initialRecipient, onIssued,
}) => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const noteRef = useRef<HTMLDivElement>(null);

  const [extraction, setExtraction] = useState<InvoiceExtraction | null>(null);
  const [baseEvaluation, setBaseEvaluation] = useState<EvaluationContext | null>(null);
  const [draft, setDraft] = useState<DeliveryNoteDraft | null>(null);
  const [ledger, setLedger] = useState<LedgerRecord[]>([]);
  const [acknowledged, setAcknowledged] = useState<Set<string>>(new Set());
  const [referenceTouched, setReferenceTouched] = useState(false);
  const [recipientPaste, setRecipientPaste] = useState('');
  const [pasteProblems, setPasteProblems] = useState<string[]>([]);
  const [model, setModel] = useState('');

  const [isReading, setIsReading] = useState(false);
  const [isIssuing, setIsIssuing] = useState(false);
  const [issued, setIssued] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const reset = useCallback(() => {
    setExtraction(null);
    setBaseEvaluation(null);
    setDraft(null);
    setLedger([]);
    setAcknowledged(new Set());
    setReferenceTouched(false);
    setRecipientPaste('');
    setPasteProblems([]);
    setModel('');
    setIssued(null);
    setShowPreview(false);
  }, []);

  useEffect(() => { if (!isOpen) reset(); }, [isOpen, reset]);

  // The ledger is part of the rules input, so it is folded back into the
  // evaluation context rather than checked separately.
  const evaluation = useMemo<EvaluationContext | null>(
    () => (baseEvaluation ? { ...baseEvaluation, ledger } : null),
    [baseEvaluation, ledger],
  );

  const flags = useMemo(
    () => (draft && evaluation ? evaluateDraft(draft, evaluation) : []),
    [draft, evaluation],
  );

  const flaggedFields = useMemo(() => {
    const map = new Map<string, 'blocking' | 'review'>();
    flags.forEach((flag) => {
      if (flag.severity === 'blocking' || !map.has(flag.field)) map.set(flag.field, flag.severity);
    });
    return map;
  }, [flags]);

  const ready = draft !== null && canGenerate(flags, acknowledged);

  const start = useCallback((
    nextExtraction: InvoiceExtraction,
    nextModel: string,
  ) => {
    const { draft: computed, evaluation: context } = computeDeliveryNote({
      extraction: nextExtraction,
      recipient: initialRecipient || null,
      deliveryMode: 'door_to_door',
    });
    setExtraction(nextExtraction);
    setBaseEvaluation(context);
    setDraft(computed);
    setModel(nextModel);
    setAcknowledged(new Set());
    setReferenceTouched(false);
    setIssued(null);
  }, [initialRecipient]);

  const handleFiles = async (files: FileList | null) => {
    const list = files ? Array.from(files) : [];
    if (!list.length) return;
    setIsReading(true);
    try {
      const result = await extractInvoice(list);
      start(result.extraction, result.model);
      toast({
        title: 'Invoice read',
        description: result.extraction.extraction_confidence_notes
          ? 'The reader flagged something — check the review panel.'
          : `${result.extraction.line_items.length} printed row(s) transcribed.`,
      });
    } catch (err) {
      toast({
        title: 'Read failed',
        description: err instanceof Error ? err.message : 'Could not read the invoice.',
        variant: 'destructive',
      });
    } finally {
      setIsReading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const startByHand = () => start({ ...EMPTY_EXTRACTION, invoice_date: format(new Date(), 'yyyy-MM-dd') }, 'manual');

  // Re-check the register whenever the identity of the note changes. Doing it
  // here rather than at generate time means a duplicate is surfaced while the
  // operator is still reviewing, not after they have committed.
  useEffect(() => {
    if (!draft) return;
    const invoice = draft.invoiceNumber.trim();
    const reference = draft.reference.trim();
    if (!invoice && !reference) { setLedger([]); return; }

    let cancelled = false;
    const timer = window.setTimeout(() => {
      findLedgerMatches(invoice, reference)
        .then((rows) => { if (!cancelled) setLedger(rows); })
        .catch((err) => {
          if (cancelled) return;
          toast({
            title: 'Register check failed',
            description: err instanceof Error ? err.message : 'Could not read the delivery note register.',
            variant: 'destructive',
          });
        });
    }, 400);

    return () => { cancelled = true; window.clearTimeout(timer); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft?.invoiceNumber, draft?.reference]);

  /**
   * Applies an edit, then re-derives the values that hang off it: the reference
   * follows the shipper's name and the load suffix unless it has been typed
   * over, and the closing row follows the destination.
   */
  const patch = (changes: Partial<DeliveryNoteDraft>) => {
    setDraft((current) => {
      if (!current) return current;
      const next: DeliveryNoteDraft = { ...current, ...changes };

      if (!referenceTouched && changes.reference === undefined) {
        const given = parseBillTo(next.shipper.name).givenName || next.shipper.name.split(/\s+/)[0] || '';
        const derived = deriveReference(given, next.invoiceNumber, next.loadSuffix);
        if (derived) next.reference = derived;
      }

      const cityChanged = changes.recipient && changes.recipient.city !== current.recipient.city;
      const modeChanged = changes.deliveryMode && changes.deliveryMode !== current.deliveryMode;
      if ((cityChanged || modeChanged) && changes.rows === undefined) {
        const rows = [...next.rows];
        const lastIndex = rows.length - 1;
        const last = rows[lastIndex];
        if (last && (last.item === 'DELIVERY' || last.item === 'COLLECTION')) {
          rows[lastIndex] = buildDeliveryRow(next.deliveryMode, next.recipient.city);
        } else {
          rows.push(buildDeliveryRow(next.deliveryMode, next.recipient.city));
        }
        next.rows = rows;
      }

      return next;
    });
  };

  const patchRow = (index: number, changes: Partial<NoteRow>) => {
    if (!draft) return;
    patch({ rows: draft.rows.map((row, i) => (i === index ? { ...row, ...changes } : row)) });
  };

  const removeRow = (index: number) => {
    if (!draft) return;
    patch({ rows: draft.rows.filter((_, i) => i !== index) });
  };

  const addRow = () => {
    if (!draft) return;
    // New goods rows go above the closing delivery row, which stays last.
    const rows = [...draft.rows];
    const insertAt = rows.length && (rows.at(-1)!.item === 'DELIVERY' || rows.at(-1)!.item === 'COLLECTION')
      ? rows.length - 1
      : rows.length;
    rows.splice(insertAt, 0, { item: '', description: '', qty: '1', uom: 'item' });
    patch({ rows });
  };

  const toggleAck = (id: string, value: boolean) => {
    setAcknowledged((current) => {
      const next = new Set(current);
      if (value) next.add(id); else next.delete(id);
      return next;
    });
  };

  // Fills the structured fields from the pasted text. Whatever it could not
  // read cleanly is said out loud rather than left as a half-written address.
  const applyRecipientPaste = () => {
    if (!draft) return;
    const parsed = parseRecipientText(recipientPaste);
    setPasteProblems(parsed.problems);
    patch({
      recipient: {
        name: parsed.name || draft.recipient.name,
        phone: parsed.phone || draft.recipient.phone,
        address: parsed.address || draft.recipient.address,
        city: parsed.city || draft.recipient.city,
      },
    });
  };

  const filename = draft ? `${draft.reference || 'DELIVERY-NOTE'}.pdf` : 'DELIVERY-NOTE.pdf';

  const handleGenerate = async () => {
    if (!draft || !noteRef.current || !ready) return;
    setIsIssuing(true);
    try {
      const unpaidHold = resolvePaidStatus(
        extraction?.red_paid_stamp_visible === true,
        draft.balanceDue,
      ).unpaidHold;

      // The register is written first: a PDF that exists without a ledger row
      // is exactly the gap that let two loads share a reference.
      await recordIssuedNote({
        draft,
        extraction,
        flags,
        acknowledged,
        unpaidHold,
        pdfFilename: filename,
        shipmentId,
      });

      await downloadNotePdf(noteRef.current, filename);
      setIssued(draft.reference);
      onIssued?.();
      toast({ title: 'Delivery note issued', description: `${filename} saved and recorded in the register.` });
    } catch (err) {
      toast({
        title: 'Could not issue the note',
        description: err instanceof Error ? err.message : 'Something went wrong.',
        variant: 'destructive',
      });
    } finally {
      setIsIssuing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl w-[96vw] max-h-[92vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle>Invoice → delivery note</DialogTitle>
          <DialogDescription>
            The invoice is read, the rules are applied, and anything ambiguous comes to you before a
            file is written.
          </DialogDescription>
        </DialogHeader>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,application/pdf"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />

        {!draft && (
          <div className="rounded-lg border-2 border-dashed p-6 sm:p-10 text-center space-y-3">
            <FileText className="h-8 w-8 mx-auto text-muted-foreground" />
            <div className="text-sm font-medium">Upload the invoice</div>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              A photo or PDF, up to 6 pages. It is transcribed exactly as printed — the delivery-note
              rules are applied afterwards, here, where you can see them.
            </p>
            <div className="flex flex-col sm:flex-row gap-2 justify-center pt-1">
              <Button onClick={() => fileInputRef.current?.click()} disabled={isReading}>
                {isReading
                  ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Reading…</>
                  : <><ScanLine className="h-4 w-4 mr-2" />Choose invoice</>}
              </Button>
              <Button variant="outline" onClick={startByHand} disabled={isReading}>
                Enter by hand instead
              </Button>
            </div>
          </div>
        )}

        {draft && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs text-muted-foreground">
                {model === 'manual' ? 'Entered by hand' : `Read by ${model}`}
                {extraction?.line_items.length ? ` · ${extraction.line_items.length} printed row(s)` : ''}
              </div>
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => fileInputRef.current?.click()}>
                <ScanLine className="h-3.5 w-3.5 mr-1.5" /> Read a different invoice
              </Button>
            </div>

            <ReviewFlags flags={flags} acknowledged={acknowledged} onAcknowledge={toggleAck} />

            {/* Identity */}
            <section className="rounded-lg border p-3 space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Reference
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <label className="space-y-1 sm:col-span-2">
                  <span className="text-xs text-muted-foreground">Delivery Note #</span>
                  <Input
                    className={fieldClass(flaggedFields, 'reference')}
                    value={draft.reference}
                    onChange={(e) => { setReferenceTouched(true); patch({ reference: e.target.value.toUpperCase() }); }}
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-xs text-muted-foreground">Invoice # (as printed)</span>
                  <Input
                    className={fieldClass(flaggedFields, 'invoiceNumber')}
                    value={draft.invoiceNumber}
                    onChange={(e) => patch({ invoiceNumber: e.target.value })}
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-xs text-muted-foreground">Load suffix</span>
                  <Input
                    className={fieldClass(flaggedFields, 'loadSuffix')}
                    placeholder="A / B / C"
                    maxLength={2}
                    value={draft.loadSuffix}
                    onChange={(e) => patch({ loadSuffix: e.target.value.toUpperCase() })}
                  />
                </label>
              </div>
              <label className="space-y-1 block sm:w-1/2">
                <span className="text-xs text-muted-foreground">Date</span>
                <Input type="date" value={draft.date} onChange={(e) => patch({ date: e.target.value })} />
              </label>
            </section>

            {/* Parties */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <section className="rounded-lg border p-3 space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Shipper</h4>
                <Input
                  placeholder="Name"
                  className={fieldClass(flaggedFields, 'shipper.name')}
                  value={draft.shipper.name}
                  onChange={(e) => patch({ shipper: { ...draft.shipper, name: e.target.value } })}
                />
                <Input
                  placeholder="Phone"
                  className={fieldClass(flaggedFields, 'shipper.phone')}
                  value={draft.shipper.phone}
                  onChange={(e) => patch({ shipper: { ...draft.shipper, phone: e.target.value } })}
                />
                <Textarea
                  rows={3}
                  placeholder="Address, one line per row"
                  value={draft.shipper.address}
                  onChange={(e) => patch({ shipper: { ...draft.shipper, address: e.target.value } })}
                />
              </section>

              <section
                className={`rounded-lg border p-3 space-y-2 ${flaggedFields.get('recipient') === 'blocking' ? 'border-red-400 bg-red-50/50' : ''}`}
              >
                <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Recipient
                  <span className="ml-2 font-normal normal-case">
                    Usually not printed on the invoice — enter who is receiving the goods.
                  </span>
                </h4>

                {/* The receiver normally arrives as a pasted message rather
                    than field by field, and the operator is on a phone. */}
                <div className="rounded-md border bg-muted/40 p-2 space-y-1.5">
                  <Textarea
                    rows={2}
                    className="text-xs bg-background"
                    placeholder="Paste the details, e.g. For Nana: NanaPetunia Simangele Mlilo, 12 Dollar Avenue, Sauerstown, Bulawayo"
                    value={recipientPaste}
                    onChange={(e) => setRecipientPaste(e.target.value)}
                  />
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      className="h-9 sm:h-8 text-xs"
                      disabled={!recipientPaste.trim()}
                      onClick={applyRecipientPaste}
                    >
                      Fill the fields
                    </Button>
                    {pasteProblems.length > 0 && (
                      <span className="text-[11px] text-amber-800">{pasteProblems.join(' ')}</span>
                    )}
                  </div>
                </div>

                <Input
                  placeholder="Name"
                  className={fieldClass(flaggedFields, 'recipient')}
                  value={draft.recipient.name}
                  onChange={(e) => patch({ recipient: { ...draft.recipient, name: e.target.value } })}
                />
                <Input
                  placeholder="Phone"
                  value={draft.recipient.phone}
                  onChange={(e) => patch({ recipient: { ...draft.recipient, phone: e.target.value } })}
                />
                <Textarea
                  rows={2}
                  placeholder="Address, one line per row"
                  className={fieldClass(flaggedFields, 'recipient')}
                  value={draft.recipient.address}
                  onChange={(e) => patch({ recipient: { ...draft.recipient, address: e.target.value } })}
                />
                <Input
                  placeholder="City"
                  className={fieldClass(flaggedFields, 'recipient.city') || fieldClass(flaggedFields, 'recipient')}
                  value={draft.recipient.city}
                  onChange={(e) => patch({ recipient: { ...draft.recipient, city: e.target.value } })}
                />
              </section>
            </div>

            {/* Delivery mode + stamp */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <section className="rounded-lg border p-3 space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Closing row</h4>
                <div className="flex gap-2">
                  {(['door_to_door', 'self_collection'] as DeliveryMode[]).map((mode) => (
                    <Button
                      key={mode}
                      type="button"
                      size="sm"
                      variant={draft.deliveryMode === mode ? 'default' : 'outline'}
                      className="flex-1 text-xs"
                      onClick={() => patch({ deliveryMode: mode })}
                    >
                      {mode === 'door_to_door' ? 'Door to door' : 'Self collection'}
                    </Button>
                  ))}
                </div>
              </section>

              <section className={`rounded-lg border p-3 space-y-2 ${fieldClass(flaggedFields, 'paid')}`}>
                <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">PAID stamp</h4>
                {/* The whole row is the tap target: a 16px box is not something
                    to ask a phone user to hit for the paid/unpaid decision. */}
                <label className="flex items-center gap-2 text-sm cursor-pointer py-1.5">
                  <input
                    type="checkbox"
                    className="h-5 w-5"
                    checked={draft.paid}
                    onChange={(e) => patch({ paid: e.target.checked })}
                  />
                  Print the red PAID stamp
                </label>
                <label className="space-y-1 block">
                  <span className="text-xs text-muted-foreground">Balance due as printed</span>
                  <Input
                    type="number"
                    step="0.01"
                    value={draft.balanceDue ?? ''}
                    onChange={(e) => patch({ balanceDue: e.target.value === '' ? null : Number(e.target.value) })}
                  />
                </label>
              </section>
            </div>

            {/* Manifest */}
            <section className="rounded-lg border p-3 space-y-2">
              <h4 className={`text-xs font-semibold uppercase tracking-wide ${flaggedFields.has('rows') ? 'text-amber-700' : 'text-muted-foreground'}`}>
                Goods — no prices on a delivery note
              </h4>
              {draft.rows.map((row, index) => (
                <div key={index} className="rounded-md border p-2 space-y-1.5 bg-background">
                  <div className="flex flex-wrap gap-2">
                    <Input
                      className="flex-1 min-w-[120px]"
                      placeholder="ITEM"
                      value={row.item}
                      onChange={(e) => patchRow(index, { item: e.target.value.toUpperCase() })}
                    />
                    <Input
                      className="w-20"
                      placeholder="Qty"
                      value={row.qty}
                      onChange={(e) => patchRow(index, { qty: e.target.value })}
                    />
                    <Input
                      className="w-24"
                      placeholder="UOM"
                      value={row.uom}
                      onChange={(e) => patchRow(index, { uom: e.target.value })}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeRow(index)}
                      title="Remove row"
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                  <Textarea
                    rows={2}
                    placeholder="Description"
                    value={row.description}
                    onChange={(e) => patchRow(index, { description: e.target.value })}
                  />
                  {row.provenance && (
                    <p className="text-[11px] text-muted-foreground italic">{row.provenance}</p>
                  )}
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={addRow}>
                <Plus className="h-4 w-4 mr-1" /> Add row
              </Button>

              {draft.dropped.length > 0 && (
                <details className="text-xs text-muted-foreground pt-1">
                  <summary className="cursor-pointer">
                    Left off the note ({draft.dropped.length})
                  </summary>
                  <ul className="list-disc pl-5 mt-1 space-y-0.5">
                    {draft.dropped.map((entry, i) => <li key={i}>{entry}</li>)}
                  </ul>
                </details>
              )}
            </section>

            {extraction && model !== 'manual' && <ExtractionSummary extraction={extraction} />}

            {/* Preview — collapsed by default so the form fits a phone screen */}
            <section className="rounded-lg border">
              <button
                type="button"
                className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                onClick={() => setShowPreview((v) => !v)}
              >
                Printed note preview
                <span>{showPreview ? 'Hide' : 'Show'}</span>
              </button>
              {/* Kept mounted and laid out even when collapsed: html2canvas
                  captures this exact node, and a display:none or clipped node
                  captures blank. Parked off-screen instead. */}
              <div
                className={showPreview ? 'overflow-x-auto bg-white border-t' : undefined}
                style={showPreview ? undefined : { position: 'absolute', left: '-10000px', top: 0, width: '900px' }}
                aria-hidden={!showPreview}
              >
                <DeliveryNoteDocument ref={noteRef} draft={draft} />
              </div>
            </section>

            {issued && (
              <div className="rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-900">
                <strong>{issued}</strong> is in the register. Any further upload of invoice{' '}
                {draft.invoiceNumber} will be checked against it.
              </div>
            )}

            <div className="flex flex-col sm:flex-row sm:justify-end gap-2 pt-1">
              <Button variant="outline" onClick={onClose}>Close</Button>
              <Button
                variant="outline"
                disabled={!ready}
                onClick={() => noteRef.current && printNote(noteRef.current, draft.reference || 'Delivery note')}
              >
                <Printer className="h-4 w-4 mr-2" /> Print
              </Button>
              {/* Once issued, the register row exists — further clicks re-save
                  the file rather than writing a second record. */}
              <Button
                onClick={issued
                  ? () => noteRef.current && downloadNotePdf(noteRef.current, filename)
                  : handleGenerate}
                disabled={!ready || isIssuing}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {isIssuing
                  ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Issuing…</>
                  : <><Download className="h-4 w-4 mr-2" />{issued ? 'Download PDF again' : 'Generate PDF'}</>}
              </Button>
            </div>
            {!ready && (
              <p className="text-xs text-right text-muted-foreground">
                Generation is blocked until every flag above is fixed or acknowledged.
              </p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default InvoiceNoteWizard;

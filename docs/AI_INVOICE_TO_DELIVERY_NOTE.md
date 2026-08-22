# Invoice → delivery note

Staff upload a photo or PDF of a Tshakmo Removals invoice. A vision model
transcribes it, a deterministic rules engine turns that transcription into a
delivery note, and anything ambiguous is put to a human before a PDF exists.

The pipeline is three separable stages, and the separation is the point:

| Stage | What it does | Where |
| --- | --- | --- |
| 1. Extraction | Transcribes the printed page. **No business rules.** | `supabase/functions/read-invoice/index.ts`, client helper `src/lib/invoiceVision.ts` |
| 2. Rules | Turns a transcription into a draft + flags. Deterministic, unit tested, no model call. | `src/lib/deliveryNote/` |
| 3. Review | Operator resolves or acknowledges every flag, then generates. | `src/components/admin/deliveryNote/` |

When a note comes out wrong, that boundary tells you whether the model misread
the page or a rule mishandled a correct read. The previous version did both in
one model call and could not answer that question.

## Why there is a review gate at all

Across the invoices this replaces, a meaningful fraction needed a judgement
call rather than an extraction: blank receiver names, a shipper name OCR'd
across two lines, one invoice number covering two genuinely different shipments,
phone last-4s that disagree with the invoice number, rows duplicated by a
screenshot artefact, seal counts that disagree with the seal codes listed.

None of those are resolved silently. A wrong note that shipped because a
low-confidence field auto-resolved is worse than the manual process this
replaces, so where the invoice is genuinely contradictory the rules engine keeps
both readings and raises a flag.

## Stage 1 — extraction

`read-invoice` is admin/staff only (JWT verified, `profiles.is_admin` or an
`admin`/`staff` role) and shares the AI rate limiter with Zimmy. It returns only
what is printed:

```jsonc
{
  "invoice_number": "04265328",   // exactly as printed, suffix included
  "invoice_date": "...", "due_date": "...",
  "bill_to_raw": "...",           // the whole block, verbatim
  "shipper_phone_raw": "...",
  "deliver_to_raw": "",           // consignee block if printed; usually empty
  "line_items": [{ "description_lines": ["..."], "quantity": 1, "rate": 90, "amount": 90 }],
  "subtotal": 0, "discount": null, "total": 0, "paid_amount": 0, "balance_due": 0,
  "red_paid_stamp_visible": false,
  "extraction_confidence_notes": ""
}
```

The prompt forbids consolidating, splitting, deduplicating, reordering,
reformatting or correcting anything. A row printed twice comes back twice.
Unreadable figures come back `null`, never `0`.

`extraction_confidence_notes` always routes to review when non-empty.

### The receiver

Whatever is on the page gets extracted; the admin fills in the rest. Three cases,
and the difference between them is the whole point of the review gate:

| On the invoice | What happens |
| --- | --- |
| No receiver (the common case) | `deliver_to_raw` is empty. **Blocking** `recipient-needed`; the admin types or pastes one. Cannot be acknowledged away. |
| A receiver printed | It is parsed and prefills the recipient, so nobody retypes it. Not blocking, but carries a **review** flag — the Bill To party is the one *paying*, and mistaking payer for consignee sends goods to the wrong door. Editing the name clears the flag; otherwise it needs acknowledging. |
| Printed *and* supplied separately | The supplied one wins (§4.4), with a review flag naming both so the override is never silent. |

A half-readable block ("Receiver: Thandiwe Sibanda", no address) prefills the
name and still blocks on the missing address and city — a partial receiver is
not a receiver.

The prompt is explicit that empty is the correct answer when no consignee is
printed, and that the Bill To party must never be copied into this field.

### Which model reads the page

**Decided: OpenAI `gpt-4o`**, the key this project already has provisioned. It
reads photos and multi-page PDFs, at roughly 1.7K tokens per read.

The function supports both providers and Claude wins automatically if its key is
ever added, so switching later is a secrets change and a redeploy — no code
edit:

- `OPENAI_API_KEY` only (current) → `OPENAI_VISION_MODEL`, default `gpt-4o`.
- `ANTHROPIC_API_KEY` also set → Claude takes precedence
  (`INVOICE_VISION_MODEL`, default `claude-opus-5`). Unset that key to go back.

```bash
supabase secrets set OPENAI_API_KEY=sk-proj-...
```

```bash
npx supabase functions deploy read-invoice --project-ref oncsaunsqtekwwbzvvyh
```

## Stage 2 — the rules engine

Plain functions in `src/lib/deliveryNote/`, no async, no network, 107 unit tests.

| File | Rule |
| --- | --- |
| `reference.ts` | REF = 3 letters of the shipper's given name + the invoice number **exactly as printed**. Strips the leading digit run, skips titles. Refuses to guess at initials-only names, `Lady X`, two-name blocks, or a name split across lines. |
| `phone.ts` | Sanity check on **digits only**: the invoice's last 4 should equal the phone's last 4. Reports a mismatch; never edits the invoice number. Formatting is an output step only, and groups for reading off paper (`+44 7700 905328`, `+263 772 123 456`); an unrecognised length is left ungrouped rather than chopped into a shape that country does not use. |
| `lineItems.ts` | Drops prices and non-goods charges. Folds "drum supplied" into its drum. One consolidated SEALS row. Physical counts from the description beat the Qty column. Splits bundles ("Dining Table and 4 chairs"). Flags a verbatim repeat instead of deduplicating or double counting. |
| `paid.ts` | Stamp only when a red stamp is visible **and** the balance is exactly zero. Any balance, however small, means no stamp plus an unpaid-hold flag. Overpaid + stamped is paid but flagged. |
| `recipient.ts` | Parses the pasted free-text receiver into name / phone / address / city. Reports a guessed city or a missing address rather than filing half an address. |
| `duplicates.ts` | Same invoice + same recipient + same items = duplicate, needing explicit confirmation. Same invoice, different recipient/city/items = a second load, **blocked** until a suffix is assigned. |
| `compute.ts` | Orchestrates the above. `computeDeliveryNote()` builds the first draft; `evaluateDraft()` re-runs every check against the operator's edits, so a flag clears when the field is actually fixed. |

### Flag severities

- **blocking** — cannot be acknowledged. The field has to change. Missing
  recipient, missing reference, an unsuffixed second load, a PAID stamp that
  contradicts the balance.
- **review** — a judgement call. Either fix the field or explicitly acknowledge
  it; the acknowledgement is stored on the register row.

`canGenerate(flags, acknowledged)` is the gate. No PDF exists and nothing is
written until it returns true.

## Stage 3 — review and the printed note

`InvoiceNoteWizard` shows every extracted and computed field with flagged fields
outlined (red = blocking, amber = review) and the full flag text on the page
rather than in a tooltip. "Enter by hand instead" covers walk-ins and phone
orders with no invoice to read, and a paste box takes the receiver as free text
("For Nana: NanaPetunia Simangele Mlilo, 12 Dollar Avenue, Sauerstown,
Bulawayo") since that is how it arrives.

Anything that changes the note is editable. The rest of the transcription — due
date, subtotal, discount, total, paid — is shown read-only in
`ExtractionSummary`, alongside the Bill To block verbatim and every printed row
with its price columns, so the operator can check the rules against the page
without reopening the invoice. An editable subtotal would change nothing
downstream, and a field that does nothing is worse than a visible one that does
not.

Verified on a 375px viewport: no horizontal scroll, the manifest row controls
wrap rather than squeeze, and the decisions an operator actually taps — the
acknowledge button, the paste button, the PAID checkbox row — are 32px or more.

The printed layout (`DeliveryNoteDocument`): logo top-left as an inlined data
URI, `DELIVERY NOTE` top-right with `Delivery Note #: <REF>` beneath, a full
width rule, a two-column SHIPPER / RECIPIENT block with a thin divider, the
table `# | Item | Description | Qty | UOM` with a blue header and alternating
rows, the rotated red PAID stamp in a band below the table when earned, and a
footer of "Zimbabwe Shipping / Tshakmo Removals" and the source invoice number.

No prices appear anywhere — it is a goods manifest, not a bill.

`pdf.ts` fits the note to a single A4 page whatever the manifest length, scaling
down rather than splitting a manifest across pages. Notes come out around
180–500 KB.

## The register

`public.delivery_note_records` (migration
`supabase/migrations/20260822090000_delivery_note_register.sql`) is the ledger
that makes duplicate detection possible, replacing a hand-kept text list that
had to be pasted into a prompt each session. It stores the reference, invoice
number, both parties, the printed rows, paid status and balance, the raw
transcription, the flags and who acknowledged them, and the confirming operator.

A unique index on `upper(reference)` is the last line of defence: two different
real loads can never share one reference.

It is **not** `public.delivery_notes`, which is the driver's proof-of-delivery
record for a run stop. This table is the printed office document; that one is
what happened at the door.

Browse it under Admin → Delivery Notes → *Delivery note register*.

### Applying the migration

> **Status: applied.** `read-invoice` and `staff-ops` were deployed to
> `oncsaunsqtekwwbzvvyh` on 2026-08-22 and `{"action":"setup"}` ran successfully
> (`Staff ops schema is ready.`). `delivery_note_records` exists with its full
> column set and its RLS read policy; the register lookup, the register list and
> an admin `select` were all confirmed working against the live database. The
> rest of this section is for the next schema change.

Per the house rule, DDL goes through the `staff-ops` edge function rather than
`db push`. This is not a preference: `supabase migration list --linked` shows
almost every local migration with an empty `remote` column, so a push would
replay ~50 old migrations, destructive ones included.

After editing a migration, re-embed and redeploy:

```bash
node tools/embed-staff-ops-sql.cjs
```

```bash
npx supabase functions deploy staff-ops --project-ref oncsaunsqtekwwbzvvyh
```

Then run the setup action, which needs an **admin** caller. Two ways:

**From the admin dashboard (no token handling).** Signed in as an admin, in the
browser console:

```javascript
const { supabase } = await import('/src/integrations/supabase/client.ts');
console.log(await supabase.functions.invoke('staff-ops', { body: { action: 'verify' } }));
console.log(await supabase.functions.invoke('staff-ops', { body: { action: 'setup' } }));
```

The app's own client attaches auth and refreshes an expiring token by itself, so
no access token is ever copied around. This is how the 2026-08-22 run was done.
(The `import` path works against the Vite dev server; on a built bundle use the
script below instead.)

**From a terminal.**

```powershell
.\scripts\apply-staff-ops-setup.ps1
```

It reads the project URL and publishable key out of `.env`, prompts for a token,
and explains a 401/403 rather than dumping a raw exception. Get the token with
`copy(JSON.parse(localStorage.getItem('sb-oncsaunsqtekwwbzvvyh-auth-token')).access_token)`
in the console of a signed-in admin tab; they last about an hour.

Either way, run `verify` first — it is read-only, and it confirms the caller is
an admin before anything changes. Expect `{"ok":true,...}` from the real run.

Note on the CLI: `supabase` is not on PATH here, it is a devDependency — always
`npx supabase ...`.

## What happened to the old pieces

- `StandaloneDeliveryNoteCreator` is gone. Its job — a note for an invoice that
  is not a booking in this system — is what the wizard does, with a review gate
  and a register row it never had.
- `DeliveryNoteGenerator` keeps its booking-derived note and its manual editor.
  Its **Note from invoice** button now opens the wizard, prefilled with the
  booking's recipient (which beats the invoice) and linked back by `shipment_id`.
- Notes saved before this change keep their stored item rows on the shipment's
  metadata and are unaffected.

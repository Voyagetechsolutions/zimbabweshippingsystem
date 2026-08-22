-- Delivery note register: the ledger of every office delivery note issued from
-- a source invoice.
--
-- This replaces a hand-kept list that had to be pasted into a prompt each
-- session. It exists so the generator can answer two questions before it writes
-- a file: has this exact note already been issued, and is this invoice number
-- already carrying a different load?
--
-- Deliberately NOT the same thing as public.delivery_notes, which is the
-- driver's proof-of-delivery record for a run stop. This table is the printed
-- office document; that one is what happened at the door.
--
-- Applied to the live DB via the staff-ops edge function's "setup" action.

create table if not exists public.delivery_note_records (
  id uuid primary key default gen_random_uuid(),

  -- REF as printed on the note: 3 letters of the shipper's given name + the
  -- invoice number exactly as printed + any load suffix.
  reference text not null,
  invoice_number text not null,
  -- A/B/C when one invoice number carries more than one real shipment. Always
  -- assigned by a human, never derived.
  load_suffix text,

  shipper_name text,
  shipper_phone text,
  shipper_address text,

  recipient_name text,
  recipient_phone text,
  recipient_address text,
  recipient_city text,

  -- The printed manifest rows, exactly as they went onto the PDF.
  items jsonb not null default '[]'::jsonb,
  -- Sorted "item:qty" digest of the goods rows, so a duplicate can be told from
  -- a second load without comparing free text.
  item_fingerprint text,

  delivery_mode text not null default 'door_to_door'
    check (delivery_mode in ('door_to_door', 'self_collection')),

  paid boolean not null default false,
  -- Money still owed at the time the note was issued. A note can go out unpaid;
  -- the register has to say so.
  balance_due numeric(12,2),
  unpaid_hold boolean not null default false,

  note_date date,
  pdf_filename text,

  -- The raw vision transcription this note was computed from, kept so a
  -- disputed note can be checked against what the invoice actually said.
  source_extraction jsonb,
  -- Flags that were live at confirmation, with who acknowledged what.
  review_flags jsonb not null default '[]'::jsonb,

  -- Set when the note was raised against a booking in this system; null for an
  -- external invoice, which is the common case.
  shipment_id uuid references public.shipments(id) on delete set null,

  confirmed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- One reference, one shipment. This constraint is the whole point of the table:
-- two different real loads must never end up sharing a reference.
create unique index if not exists delivery_note_records_reference_key
  on public.delivery_note_records (upper(reference));

create index if not exists delivery_note_records_invoice_idx
  on public.delivery_note_records (invoice_number);
create index if not exists delivery_note_records_created_idx
  on public.delivery_note_records (created_at desc);

alter table public.delivery_note_records enable row level security;

drop policy if exists "Staff read delivery note register" on public.delivery_note_records;
create policy "Staff read delivery note register" on public.delivery_note_records
  for select to authenticated
  using (public.is_staff_member());

drop policy if exists "Staff write delivery note register" on public.delivery_note_records;
create policy "Staff write delivery note register" on public.delivery_note_records
  for insert to authenticated
  with check (public.is_staff_member() and confirmed_by = auth.uid());

-- Corrections stay with admins: an issued note is a record of what was printed,
-- not a working draft.
drop policy if exists "Admins amend delivery note register" on public.delivery_note_records;
create policy "Admins amend delivery note register" on public.delivery_note_records
  for update to authenticated
  using (public.is_operations_admin()) with check (public.is_operations_admin());

create or replace function public.touch_delivery_note_records()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists delivery_note_records_touch on public.delivery_note_records;
create trigger delivery_note_records_touch
  before update on public.delivery_note_records
  for each row execute function public.touch_delivery_note_records();

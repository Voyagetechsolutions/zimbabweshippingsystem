-- Zimbabwe Shipping finance ERP foundation.
-- Extends the existing payment, receipt, driver invoice and expense records;
-- no production finance rows are deleted or assigned invented values.

create table if not exists public.finance_currencies (
  code text primary key check (code = upper(code) and char_length(code) = 3),
  name text not null,
  symbol text not null,
  decimal_places smallint not null default 2 check (decimal_places between 0 and 4),
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.finance_currencies(code,name,symbol) values
  ('GBP','Pound sterling','£'), ('EUR','Euro','€'), ('USD','US dollar','$')
on conflict (code) do nothing;

create table if not exists public.finance_settings (
  id boolean primary key default true check (id),
  base_currency_code text not null references public.finance_currencies(code) default 'GBP',
  fiscal_year_start_month smallint not null default 1 check (fiscal_year_start_month between 1 and 12),
  default_payment_terms_days integer not null default 7 check (default_payment_terms_days between 0 and 365),
  invoice_prefix text not null default 'INV',
  quote_prefix text not null default 'QUO',
  receipt_prefix text not null default 'RCT',
  company_details jsonb not null default '{}'::jsonb,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);
insert into public.finance_settings(id) values(true) on conflict(id) do nothing;

create table if not exists public.finance_number_sequences (
  document_type text primary key check (document_type in ('quote','invoice','credit_note','receipt','journal','supplier_bill')),
  prefix text not null,
  next_number bigint not null default 1 check (next_number > 0),
  updated_at timestamptz not null default now()
);
insert into public.finance_number_sequences(document_type,prefix) values
  ('quote','QUO'),('invoice','INV'),('credit_note','CN'),('receipt','RCT'),('journal','JRN'),('supplier_bill','BILL')
on conflict(document_type) do nothing;

create table if not exists public.customer_finance_accounts (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null unique references public.profiles(id) on delete restrict,
  preferred_currency_code text references public.finance_currencies(code),
  account_status text not null default 'active' check (account_status in ('active','on_hold','closed')),
  credit_limit numeric(14,2) check (credit_limit is null or credit_limit >= 0),
  billing_address jsonb,
  finance_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.finance_products (
  id uuid primary key default gen_random_uuid(),
  code text unique,
  name text not null,
  description text,
  unit text not null default 'item',
  default_unit_price numeric(14,2) not null default 0 check (default_unit_price >= 0),
  currency_code text not null references public.finance_currencies(code) default 'GBP',
  revenue_account_code text,
  tax_code text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.finance_quotes (
  id uuid primary key default gen_random_uuid(),
  quote_number text not null unique,
  customer_id uuid references public.profiles(id) on delete restrict,
  shipment_id uuid references public.shipments(id) on delete set null,
  currency_code text not null references public.finance_currencies(code),
  status text not null default 'draft' check (status in ('draft','sent','accepted','declined','expired','converted','void')),
  issue_date date not null default current_date,
  expiry_date date,
  subtotal numeric(14,2) not null default 0,
  discount_total numeric(14,2) not null default 0,
  tax_total numeric(14,2) not null default 0,
  total numeric(14,2) not null default 0,
  notes text,
  terms text,
  accepted_at timestamptz,
  converted_invoice_id uuid,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.finance_quote_lines (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references public.finance_quotes(id) on delete cascade,
  product_id uuid references public.finance_products(id) on delete set null,
  description text not null,
  quantity numeric(14,4) not null default 1 check (quantity > 0),
  unit_price numeric(14,4) not null default 0 check (unit_price >= 0),
  discount_amount numeric(14,2) not null default 0 check (discount_amount >= 0),
  tax_rate numeric(7,4) not null default 0 check (tax_rate >= 0),
  line_subtotal numeric(14,2) generated always as (round((quantity * unit_price)::numeric,2)) stored,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

-- The application already uses driver_invoices as its issued invoice register.
-- Widen it into the canonical invoice record instead of creating a duplicate.
alter table public.driver_invoices alter column shipment_id drop not null;
alter table public.driver_invoices alter column stop_id drop not null;
alter table public.driver_invoices alter column driver_id drop not null;
alter table public.driver_invoices add column if not exists customer_id uuid references public.profiles(id) on delete restrict;
alter table public.driver_invoices add column if not exists quote_id uuid references public.finance_quotes(id) on delete set null;
alter table public.driver_invoices add column if not exists booking_id uuid;
alter table public.driver_invoices add column if not exists original_amount numeric(14,2);
alter table public.driver_invoices add column if not exists base_currency_amount numeric(14,2);
alter table public.driver_invoices add column if not exists exchange_rate numeric(18,8);
alter table public.driver_invoices add column if not exists exchange_rate_date date;
alter table public.driver_invoices add column if not exists exchange_rate_source text;
alter table public.driver_invoices add column if not exists sent_at timestamptz;
alter table public.driver_invoices add column if not exists voided_at timestamptz;
alter table public.driver_invoices add column if not exists void_reason text;
alter table public.driver_invoices add column if not exists version integer not null default 1;
alter table public.driver_invoices drop constraint if exists driver_invoices_status_check;
alter table public.driver_invoices add constraint driver_invoices_status_check check (status in ('draft','issued','sent','viewed','partial','partially_paid','paid','overdue','void','cancelled','refunded','credited'));

create table if not exists public.finance_invoice_lines (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.driver_invoices(id) on delete restrict,
  product_id uuid references public.finance_products(id) on delete set null,
  description text not null,
  quantity numeric(14,4) not null default 1 check (quantity > 0),
  unit_price numeric(14,4) not null default 0 check (unit_price >= 0),
  discount_amount numeric(14,2) not null default 0 check (discount_amount >= 0),
  tax_rate numeric(7,4) not null default 0 check (tax_rate >= 0),
  revenue_account_code text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.finance_quotes
  drop constraint if exists finance_quotes_converted_invoice_id_fkey;
alter table public.finance_quotes
  add constraint finance_quotes_converted_invoice_id_fkey foreign key(converted_invoice_id) references public.driver_invoices(id) on delete set null;

alter table public.payments add column if not exists original_amount numeric(14,2);
alter table public.payments add column if not exists base_currency_amount numeric(14,2);
alter table public.payments add column if not exists exchange_rate numeric(18,8);
alter table public.payments add column if not exists exchange_rate_date date;
alter table public.payments add column if not exists exchange_rate_source text;
alter table public.payments add column if not exists received_at timestamptz;
alter table public.payments add column if not exists verified_at timestamptz;
alter table public.payments add column if not exists verified_by uuid references auth.users(id) on delete set null;
alter table public.payments add column if not exists reversed_at timestamptz;
alter table public.payments add column if not exists reversal_reason text;
alter table public.payments add column if not exists idempotency_key text;
create unique index if not exists payments_idempotency_idx on public.payments(idempotency_key) where idempotency_key is not null;

create table if not exists public.finance_payment_allocations (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.payments(id) on delete restrict,
  invoice_id uuid not null references public.driver_invoices(id) on delete restrict,
  amount numeric(14,2) not null check (amount > 0),
  currency_code text not null references public.finance_currencies(code),
  idempotency_key text unique,
  allocated_by uuid references auth.users(id) on delete set null default auth.uid(),
  allocated_at timestamptz not null default now(),
  reversed_at timestamptz,
  reversal_reason text
);

alter table public.receipts add column if not exists customer_id uuid references public.profiles(id) on delete set null;
alter table public.receipts add column if not exists issued_at timestamptz;
alter table public.receipts add column if not exists issued_by uuid references auth.users(id) on delete set null;
alter table public.receipts add column if not exists voided_at timestamptz;

create table if not exists public.finance_credit_notes (
  id uuid primary key default gen_random_uuid(),
  credit_note_number text not null unique,
  invoice_id uuid not null references public.driver_invoices(id) on delete restrict,
  customer_id uuid references public.profiles(id) on delete restrict,
  currency_code text not null references public.finance_currencies(code),
  amount numeric(14,2) not null check (amount > 0),
  reason text not null,
  status text not null default 'draft' check (status in ('draft','issued','allocated','refunded','void')),
  issued_at timestamptz,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);

create table if not exists public.finance_expense_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  account_code text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
insert into public.finance_expense_categories(name) values
 ('Fuel'),('Vehicle repairs'),('Warehouse'),('Port charges'),('Customs and clearance'),('Ocean freight'),('Driver costs'),('Office expenses'),('Bank fees'),('Other')
on conflict(name) do nothing;

alter table public.finance_expenses add column if not exists category_id uuid references public.finance_expense_categories(id) on delete set null;
alter table public.finance_expenses add column if not exists original_amount numeric(14,2);
alter table public.finance_expenses add column if not exists base_currency_amount numeric(14,2);
alter table public.finance_expenses add column if not exists exchange_rate numeric(18,8);
alter table public.finance_expenses add column if not exists exchange_rate_date date;
alter table public.finance_expenses add column if not exists exchange_rate_source text;
alter table public.finance_expenses drop constraint if exists finance_expenses_status_check;
alter table public.finance_expenses add constraint finance_expenses_status_check check (status in ('draft','recorded','submitted','approved','paid','rejected','void'));

create table if not exists public.finance_suppliers (
  id uuid primary key default gen_random_uuid(),
  supplier_code text unique,
  name text not null,
  email text,
  phone text,
  address jsonb,
  currency_code text references public.finance_currencies(code),
  payment_terms_days integer not null default 30 check (payment_terms_days between 0 and 365),
  tax_number text,
  status text not null default 'active' check (status in ('active','on_hold','inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.finance_supplier_bills (
  id uuid primary key default gen_random_uuid(),
  bill_number text not null unique,
  supplier_id uuid not null references public.finance_suppliers(id) on delete restrict,
  supplier_reference text,
  currency_code text not null references public.finance_currencies(code),
  bill_date date not null default current_date,
  due_date date,
  subtotal numeric(14,2) not null default 0,
  tax_total numeric(14,2) not null default 0,
  total numeric(14,2) not null default 0 check (total >= 0),
  amount_paid numeric(14,2) not null default 0 check (amount_paid >= 0),
  status text not null default 'draft' check (status in ('draft','submitted','approved','partial','paid','overdue','void')),
  related_entity_type text,
  related_entity_id uuid,
  notes text,
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.finance_accounts (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  account_type text not null check (account_type in ('asset','liability','equity','revenue','cost_of_sales','expense')),
  parent_id uuid references public.finance_accounts(id) on delete restrict,
  currency_code text references public.finance_currencies(code),
  allow_manual_posting boolean not null default true,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

insert into public.finance_accounts(code,name,account_type,allow_manual_posting) values
 ('1000','Bank and Cash','asset',false),('1100','Accounts Receivable','asset',false),('2000','Accounts Payable','liability',false),
 ('2100','Customer Deposits','liability',false),('4000','Shipping Revenue','revenue',true),('5000','Ocean Freight','cost_of_sales',true),
 ('5010','Container Costs','cost_of_sales',true),('5020','Port Charges','cost_of_sales',true),('5030','Customs and Clearance','cost_of_sales',true),
 ('5040','Collection Driver Costs','cost_of_sales',true),('5050','Zimbabwe Delivery Costs','cost_of_sales',true),('5060','Warehouse Handling','cost_of_sales',true),
 ('6010','Fuel','expense',true),('6090','Bank Fees','expense',true),('6140','Other Expenses','expense',true)
on conflict(code) do nothing;

create table if not exists public.finance_periods (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  starts_on date not null,
  ends_on date not null check (ends_on >= starts_on),
  status text not null default 'open' check (status in ('open','locked','closed')),
  closed_by uuid references auth.users(id) on delete set null,
  closed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.finance_journals (
  id uuid primary key default gen_random_uuid(),
  journal_number text not null unique,
  journal_date date not null default current_date,
  description text not null,
  reference text,
  source_type text,
  source_id uuid,
  status text not null default 'draft' check (status in ('draft','submitted','approved','posted','reversed')),
  idempotency_key text unique,
  reversal_of uuid references public.finance_journals(id) on delete restrict,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  approved_by uuid references auth.users(id) on delete set null,
  posted_by uuid references auth.users(id) on delete set null,
  posted_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.finance_journal_lines (
  id uuid primary key default gen_random_uuid(),
  journal_id uuid not null references public.finance_journals(id) on delete restrict,
  account_id uuid not null references public.finance_accounts(id) on delete restrict,
  description text,
  debit numeric(14,2) not null default 0 check (debit >= 0),
  credit numeric(14,2) not null default 0 check (credit >= 0),
  currency_code text not null references public.finance_currencies(code),
  original_amount numeric(14,2),
  exchange_rate numeric(18,8),
  customer_id uuid references public.profiles(id) on delete restrict,
  supplier_id uuid references public.finance_suppliers(id) on delete restrict,
  related_entity_type text,
  related_entity_id uuid,
  created_at timestamptz not null default now(),
  check ((debit > 0 and credit = 0) or (credit > 0 and debit = 0))
);

create table if not exists public.finance_bank_accounts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  account_type text not null default 'bank' check (account_type in ('bank','cash','mobile_money','card_clearing')),
  currency_code text not null references public.finance_currencies(code),
  ledger_account_id uuid references public.finance_accounts(id) on delete restrict,
  opening_balance numeric(14,2) not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.finance_bank_transactions (
  id uuid primary key default gen_random_uuid(),
  bank_account_id uuid not null references public.finance_bank_accounts(id) on delete restrict,
  transaction_date date not null,
  amount numeric(14,2) not null check (amount <> 0),
  currency_code text not null references public.finance_currencies(code),
  reference text,
  description text,
  import_batch text,
  external_id text,
  reconciliation_status text not null default 'unmatched' check (reconciliation_status in ('unmatched','suggested','matched','excluded')),
  matched_payment_id uuid references public.payments(id) on delete restrict,
  matched_journal_id uuid references public.finance_journals(id) on delete restrict,
  reconciled_by uuid references auth.users(id) on delete set null,
  reconciled_at timestamptz,
  created_at timestamptz not null default now(),
  unique(bank_account_id,external_id)
);

create table if not exists public.finance_cost_allocations (
  id uuid primary key default gen_random_uuid(),
  expense_id uuid references public.finance_expenses(id) on delete restrict,
  supplier_bill_id uuid references public.finance_supplier_bills(id) on delete restrict,
  target_type text not null check (target_type in ('shipment','booking','collection_route','consignment','container','warehouse','vehicle','region','branch','customer')),
  target_id uuid,
  target_reference text,
  allocation_method text not null default 'manual' check (allocation_method in ('manual','per_package','weight','volume','revenue','shipment_count')),
  amount numeric(14,2) not null check (amount > 0),
  currency_code text not null references public.finance_currencies(code),
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  check ((expense_id is not null)::int + (supplier_bill_id is not null)::int = 1)
);

create table if not exists public.finance_audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  before_data jsonb,
  after_data jsonb,
  reason text,
  created_at timestamptz not null default now()
);

create index if not exists finance_invoice_customer_idx on public.driver_invoices(customer_id,issue_date desc);
create index if not exists finance_allocations_invoice_idx on public.finance_payment_allocations(invoice_id) where reversed_at is null;
create index if not exists finance_allocations_payment_idx on public.finance_payment_allocations(payment_id) where reversed_at is null;
create index if not exists finance_quotes_customer_idx on public.finance_quotes(customer_id,issue_date desc);
create index if not exists finance_bills_due_idx on public.finance_supplier_bills(status,due_date);
create index if not exists finance_journal_lines_account_idx on public.finance_journal_lines(account_id,journal_id);
create index if not exists finance_bank_match_idx on public.finance_bank_transactions(bank_account_id,reconciliation_status,transaction_date desc);
create index if not exists finance_cost_target_idx on public.finance_cost_allocations(target_type,target_id,target_reference);

create or replace function public.finance_next_number(p_document_type text) returns text
language plpgsql security definer set search_path=public as $$
declare v_prefix text; v_number bigint;
begin
  if not public.is_finance_staff() then raise exception 'Finance access required'; end if;
  update public.finance_number_sequences set next_number=next_number+1,updated_at=now()
    where document_type=p_document_type returning prefix,next_number-1 into v_prefix,v_number;
  if not found then raise exception 'Unknown finance document type'; end if;
  return v_prefix||'-'||to_char(current_date,'YYYY')||'-'||lpad(v_number::text,6,'0');
end $$;

create or replace function public.allocate_finance_payment(p_payment_id uuid,p_invoice_id uuid,p_amount numeric,p_idempotency_key text default null) returns jsonb
language plpgsql security definer set search_path=public as $$
declare v_payment public.payments%rowtype; v_invoice public.driver_invoices%rowtype; v_paid numeric; v_payment_allocated numeric; v_row public.finance_payment_allocations%rowtype;
begin
  if not public.is_finance_staff() then raise exception 'Finance access required'; end if;
  if p_amount is null or p_amount<=0 then raise exception 'Allocation amount must be greater than zero'; end if;
  if p_idempotency_key is not null then select * into v_row from public.finance_payment_allocations where idempotency_key=p_idempotency_key; if found then return to_jsonb(v_row); end if; end if;
  select * into v_payment from public.payments where id=p_payment_id for update; if not found then raise exception 'Payment not found'; end if;
  select * into v_invoice from public.driver_invoices where id=p_invoice_id for update; if not found then raise exception 'Invoice not found'; end if;
  if upper(coalesce(v_payment.currency,'GBP'))<>upper(coalesce(v_invoice.currency,'GBP')) then raise exception 'Payment and invoice currencies differ; record an explicit exchange rate first'; end if;
  if v_payment.reversed_at is not null then raise exception 'A reversed payment cannot be allocated'; end if;
  if v_invoice.status in ('void','paid') then raise exception 'Invoice is not open for allocation'; end if;
  select coalesce(sum(amount),0) into v_paid from public.finance_payment_allocations where invoice_id=p_invoice_id and reversed_at is null;
  select coalesce(sum(amount),0) into v_payment_allocated from public.finance_payment_allocations where payment_id=p_payment_id and reversed_at is null;
  if p_amount > greatest(0,v_invoice.total-v_paid) then raise exception 'Allocation exceeds invoice balance'; end if;
  if p_amount > greatest(0,v_payment.amount-v_payment_allocated) then raise exception 'Allocation exceeds unallocated payment amount'; end if;
  insert into public.finance_payment_allocations(payment_id,invoice_id,amount,currency_code,idempotency_key)
    values(p_payment_id,p_invoice_id,p_amount,upper(coalesce(v_payment.currency,'GBP')),p_idempotency_key) returning * into v_row;
  v_paid:=v_paid+p_amount;
  update public.driver_invoices set status=case when v_paid>=total then 'paid' else 'partial' end,updated_at=now() where id=p_invoice_id;
  insert into public.finance_audit_log(actor_id,action,entity_type,entity_id,after_data) values(auth.uid(),'PAYMENT_ALLOCATED','invoice',p_invoice_id,to_jsonb(v_row));
  return to_jsonb(v_row)||jsonb_build_object('invoicePaid',v_paid,'invoiceBalance',greatest(0,v_invoice.total-v_paid));
end $$;

create or replace function public.post_finance_journal(p_journal_id uuid) returns jsonb
language plpgsql security definer set search_path=public as $$
declare v_journal public.finance_journals%rowtype; v_debit numeric; v_credit numeric; v_period_status text;
begin
  if not public.is_finance_staff() then raise exception 'Finance access required'; end if;
  select * into v_journal from public.finance_journals where id=p_journal_id for update; if not found then raise exception 'Journal not found'; end if;
  if v_journal.status='posted' then return to_jsonb(v_journal); end if;
  if v_journal.status not in ('draft','submitted','approved') then raise exception 'Journal cannot be posted from status %',v_journal.status; end if;
  select status into v_period_status from public.finance_periods where v_journal.journal_date between starts_on and ends_on order by starts_on desc limit 1;
  if coalesce(v_period_status,'open')<>'open' then raise exception 'The accounting period is locked or closed'; end if;
  select coalesce(sum(debit),0),coalesce(sum(credit),0) into v_debit,v_credit from public.finance_journal_lines where journal_id=p_journal_id;
  if v_debit=0 or abs(v_debit-v_credit)>0.005 then raise exception 'Journal debits and credits must balance'; end if;
  update public.finance_journals set status='posted',posted_by=auth.uid(),posted_at=now() where id=p_journal_id returning * into v_journal;
  insert into public.finance_audit_log(actor_id,action,entity_type,entity_id,after_data) values(auth.uid(),'JOURNAL_POSTED','journal',p_journal_id,to_jsonb(v_journal));
  return to_jsonb(v_journal)||jsonb_build_object('debit',v_debit,'credit',v_credit);
end $$;

create or replace function public.finance_customer_statement(p_customer_id uuid,p_from date default null,p_to date default null) returns jsonb
language plpgsql security definer set search_path=public as $$
declare v_from date:=coalesce(p_from,current_date-interval '1 year'); v_to date:=coalesce(p_to,current_date); v_invoices jsonb; v_payments jsonb; v_total numeric; v_paid numeric;
begin
  if not (public.is_finance_staff() or p_customer_id=auth.uid()) then raise exception 'Access denied'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('id',i.id,'date',i.issue_date,'number',i.invoice_number,'currency',i.currency,'total',i.total,'status',i.status) order by i.issue_date),'[]'::jsonb),coalesce(sum(i.total),0)
    into v_invoices,v_total from public.driver_invoices i where i.customer_id=p_customer_id and i.issue_date between v_from and v_to and i.status<>'void';
  select coalesce(jsonb_agg(jsonb_build_object('id',a.id,'date',a.allocated_at,'invoiceId',a.invoice_id,'currency',a.currency_code,'amount',a.amount) order by a.allocated_at),'[]'::jsonb),coalesce(sum(a.amount),0)
    into v_payments,v_paid from public.finance_payment_allocations a join public.driver_invoices i on i.id=a.invoice_id where i.customer_id=p_customer_id and a.reversed_at is null and a.allocated_at::date between v_from and v_to;
  return jsonb_build_object('customerId',p_customer_id,'from',v_from,'to',v_to,'invoices',v_invoices,'payments',v_payments,'totalInvoiced',v_total,'totalPaid',v_paid,'balance',v_total-v_paid);
end $$;

create or replace function public.prevent_posted_finance_mutation() returns trigger language plpgsql as $$
begin
  if old.status='posted' then raise exception 'Posted accounting transactions cannot be changed or deleted; create a reversal'; end if;
  return case when tg_op='DELETE' then old else new end;
end $$;
drop trigger if exists protect_posted_journals on public.finance_journals;
create trigger protect_posted_journals before update or delete on public.finance_journals for each row execute function public.prevent_posted_finance_mutation();

-- Finance-only access. Customer statement access is deliberately exposed only through the guarded RPC.
do $$ declare t text; begin
  foreach t in array array['finance_currencies','finance_settings','finance_number_sequences','customer_finance_accounts','finance_products','finance_quotes','finance_quote_lines','finance_invoice_lines','finance_payment_allocations','finance_credit_notes','finance_expense_categories','finance_suppliers','finance_supplier_bills','finance_accounts','finance_periods','finance_journals','finance_journal_lines','finance_bank_accounts','finance_bank_transactions','finance_cost_allocations','finance_audit_log']
  loop
    execute format('alter table public.%I enable row level security',t);
    execute format('drop policy if exists "Finance staff manage %s" on public.%I',t,t);
    execute format('create policy "Finance staff manage %s" on public.%I for all to authenticated using (public.is_finance_staff()) with check (public.is_finance_staff())',t,t);
  end loop;
end $$;

grant execute on function public.finance_next_number(text) to authenticated;
grant execute on function public.allocate_finance_payment(uuid,uuid,numeric,text) to authenticated;
grant execute on function public.post_finance_journal(uuid) to authenticated;
grant execute on function public.finance_customer_statement(uuid,date,date) to authenticated;

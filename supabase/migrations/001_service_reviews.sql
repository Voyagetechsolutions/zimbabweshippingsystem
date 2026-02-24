-- ============================================
-- Service Reviews v2 — safe to re-run
-- ============================================

-- Drop old tables (cascade drops policies + indexes)
drop table if exists public.service_reviews cascade;
drop table if exists public.feedback_custom_questions cascade;


-- Create service_reviews
create table public.service_reviews (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),

  -- Identity
  full_name text not null,
  customer_reference_number text not null,

  -- Overall experience (1-3 stars)
  overall_experience int not null check (overall_experience between 1 and 3),

  -- Overall customer service (1-3 stars)
  overall_customer_service int not null check (overall_customer_service between 1 and 3),

  -- Satisfaction ratings (1-3 stars each)
  satisfaction_bookings_customer_service int not null check (satisfaction_bookings_customer_service between 1 and 3),
  satisfaction_collections_uk int not null check (satisfaction_collections_uk between 1 and 3),
  satisfaction_accounts int not null check (satisfaction_accounts between 1 and 3),
  satisfaction_deliveries int not null check (satisfaction_deliveries between 1 and 3),

  -- Did your parcel arrive as anticipated?
  parcel_arrived_as_anticipated text not null check (parcel_arrived_as_anticipated in ('yes','no','partially')),

  -- Additional comments (toggle + text)
  has_additional_comments boolean not null default false,
  additional_comments text null,

  -- Dynamic custom question answers
  custom_answers jsonb null default '{}'::jsonb
);

create index service_reviews_ref_idx on public.service_reviews (customer_reference_number);

alter table public.service_reviews enable row level security;

create policy "Allow public inserts"
on public.service_reviews for insert to anon with check (true);

create policy "Allow authenticated select"
on public.service_reviews for select to authenticated using (true);


-- Create feedback_custom_questions
create table public.feedback_custom_questions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  question_text text not null,
  question_type text not null check (question_type in ('text','select','radio','linear_scale')),
  options jsonb null,
  is_required boolean not null default false,
  is_active boolean not null default true,
  sort_order int not null default 0
);

alter table public.feedback_custom_questions enable row level security;

create policy "Allow public select"
on public.feedback_custom_questions for select to anon using (true);

create policy "Allow authenticated all"
on public.feedback_custom_questions for all to authenticated using (true) with check (true);

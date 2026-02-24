-- ============================================
-- Service Reviews — safe to re-run
-- ============================================

-- Drop old tables (cascade drops their policies + indexes too)
drop table if exists public.service_reviews cascade;
drop table if exists public.feedback_custom_questions cascade;


-- Create service_reviews
create table public.service_reviews (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),

  full_name text not null,
  customer_reference_number text not null,

  how_heard_about_us text not null,
  how_heard_other text null,

  overall_experience int not null check (overall_experience between 1 and 5),

  satisfaction_delivery_time int not null check (satisfaction_delivery_time between 1 and 5),
  satisfaction_customer_service int not null check (satisfaction_customer_service between 1 and 5),
  satisfaction_parcel_safety int not null check (satisfaction_parcel_safety between 1 and 5),
  satisfaction_price_fairness int not null check (satisfaction_price_fairness between 1 and 5),

  parcel_arrived_on_time text not null check (parcel_arrived_on_time in ('yes','no','partially')),
  would_recommend text not null check (would_recommend in ('definitely','maybe','no')),

  has_additional_comments boolean not null,
  additional_comments text null,

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

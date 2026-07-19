-- Zimmy AI review moderation.
-- NOTE: this DDL is also applied idempotently by the moderate-review edge
-- function's "setup" action (the remote migration history is out of sync,
-- so this file documents the schema rather than being the delivery vehicle).

alter table public.reviews add column if not exists moderation_status text not null default 'pending';
alter table public.reviews add column if not exists moderation_sentiment text;
alter table public.reviews add column if not exists moderation_reason text;
alter table public.reviews add column if not exists moderated_at timestamptz;

create index if not exists reviews_moderation_status_idx on public.reviews (moderation_status);

-- moderation_status values (enforced in the edge function, not a check
-- constraint, so re-runs stay simple):
--   pending   – awaiting Zimmy moderation; hidden from the public page
--   published – positive/okay review, shown publicly
--   flagged   – negative review, hidden and surfaced on the admin dashboard
--   hidden    – reviewed by an admin and kept off the public page

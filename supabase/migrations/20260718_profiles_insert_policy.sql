-- Customer-app onboarding upserts the caller's own profile row. Brand-new
-- users have no profiles row yet, so the upsert INSERTs — which was blocked
-- because profiles only had UPDATE/SELECT policies.
--
-- NOTE: applied to the live DB via the staff-ops edge function's "setup"
-- action (migration history is out of sync — never `db push`). This file is
-- documentation of the applied DDL.

drop policy if exists "Customers insert own profile" on public.profiles;
create policy "Customers insert own profile" on public.profiles
  for insert to authenticated with check (id = auth.uid());

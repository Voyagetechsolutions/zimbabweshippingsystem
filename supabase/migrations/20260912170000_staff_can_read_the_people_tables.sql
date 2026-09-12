-- Three tables the admin dashboard reads that row-level security made
-- unreadable. Found by probing every table the UI touches as the role that
-- touches it, rather than as the superuser the migrations run as.
--
--   profiles         213 rows, an admin could see 1
--   system_settings    3 rows, nobody could see any
--   user_roles         3 rows, nobody could see any

-- ---------------------------------------------------------------------------
-- A. profiles: staff can see the people they work with
-- ---------------------------------------------------------------------------
--
-- The only SELECT policy was `id = auth.uid()`, so every account — admin
-- included — saw exactly its own row and nothing else. Six mounted admin
-- screens read this table directly and were quietly getting one row: the
-- driver list in Delivery Management, the driver recipients in Staff Messages,
-- the driver names on the Collections map, and the customer lookups in
-- Payments, Payment Schedules and Custom Quotes.
--
-- `is_operations_admin()` and `is_finance_staff()` are both SECURITY DEFINER,
-- so they read `profiles` with RLS bypassed. That matters: a policy on
-- `profiles` that queried `profiles` through a plain function would recurse.

drop policy if exists "Staff read profiles" on public.profiles;
create policy "Staff read profiles"
  on public.profiles for select
  to authenticated
  using (public.is_operations_admin() or public.is_finance_staff());

-- Admin-only, and update-only. Nothing in the product deletes a profile, and
-- the existing "own profile" policies are left exactly as they were.
drop policy if exists "Operations admin updates profiles" on public.profiles;
create policy "Operations admin updates profiles"
  on public.profiles for update
  to authenticated
  using (public.is_operations_admin())
  with check (public.is_operations_admin());

-- ---------------------------------------------------------------------------
-- B. system_settings and user_roles: a condition that could never be true
-- ---------------------------------------------------------------------------
--
-- Both were guarded by `auth.role() = 'admin'`. `auth.role()` returns the
-- Postgres role carried in the JWT — `authenticated` or `anon` — and never
-- 'admin'. Admin-ness in this product lives in `profiles.is_admin` and
-- `profiles.role`. So the condition was false for every caller including the
-- real admins, and both tables read back empty with no error to explain it.
--
-- The policies were also granted to `public`, which includes `anon`. Narrowed
-- to `authenticated` on the way past.

drop policy if exists "Only admins can view settings" on public.system_settings;
drop policy if exists "Only admins can update settings" on public.system_settings;
create policy "Operations admin reads settings"
  on public.system_settings for select
  to authenticated using (public.is_operations_admin());
create policy "Operations admin writes settings"
  on public.system_settings for all
  to authenticated
  using (public.is_operations_admin())
  with check (public.is_operations_admin());

drop policy if exists "Only admins can manage roles" on public.user_roles;
create policy "Operations admin manages roles"
  on public.user_roles for all
  to authenticated
  using (public.is_operations_admin())
  with check (public.is_operations_admin());

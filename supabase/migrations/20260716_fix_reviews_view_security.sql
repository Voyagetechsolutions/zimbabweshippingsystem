-- Security fix: Supabase linter "security_definer_view" (Critical) on
-- public.reviews_needing_attention.
--
-- The view was created without security_invoker, so it ran with the view
-- creator's permissions and bypassed RLS on service_reviews. One applied
-- variant (docs/FEEDBACK_SCHEMA_UPDATE.sql) also granted SELECT to anon,
-- exposing customer names, emails and WhatsApp numbers publicly.
--
-- NOTE: applied to the live database via the moderate-review edge function's
-- "setup" action (migration history is out of sync; see that function).

drop view if exists public.reviews_needing_attention;

create view public.reviews_needing_attention
with (security_invoker = on) as
select
  id, created_at, first_name, last_name, email, whatsapp_number,
  booking_ease, communication_rating, customer_service_rating,
  delivery_on_time, goods_condition, overall_satisfaction,
  follow_up_answers, additional_feedback, liked_most, can_improve
from public.service_reviews
where needs_admin_attention = true
order by created_at desc;

revoke all on public.reviews_needing_attention from anon, public;
grant select on public.reviews_needing_attention to authenticated;

-- Only admins/staff may read customer feedback (it contains PII).
-- The public Feedback form only inserts, so this breaks nothing.
drop policy if exists "Allow authenticated select" on public.service_reviews;
drop policy if exists "Admins can read service reviews" on public.service_reviews;
create policy "Admins can read service reviews" on public.service_reviews
  for select to authenticated
  using (exists (
    select 1 from public.profiles
    where id = auth.uid() and (is_admin = true or role in ('admin', 'staff'))
  ));

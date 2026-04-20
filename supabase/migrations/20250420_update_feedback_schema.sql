-- ============================================
-- Update Feedback Schema for New Structure
-- ============================================

-- Add new columns to service_reviews table
alter table public.service_reviews 
add column if not exists first_name text,
add column if not exists last_name text,
add column if not exists email text,
add column if not exists whatsapp_number text,
add column if not exists is_first_time text,
add column if not exists booking_ease text,
add column if not exists communication_rating text,
add column if not exists customer_service_rating text,
add column if not exists delivery_on_time text,
add column if not exists goods_condition text,
add column if not exists overall_satisfaction text,
add column if not exists follow_up_answers jsonb,
add column if not exists liked_most text,
add column if not exists can_improve text,
add column if not exists needs_admin_attention boolean default false;

-- Create index for admin attention flag
create index if not exists service_reviews_admin_attention_idx 
on public.service_reviews (needs_admin_attention, created_at desc);

-- Create index for email lookups
create index if not exists service_reviews_email_idx 
on public.service_reviews (email);

-- Add check constraints for new rating fields
alter table public.service_reviews 
add constraint check_booking_ease 
check (booking_ease is null or booking_ease in ('Very Easy', 'Easy', 'Neutral', 'Difficult', 'Very Difficult'));

alter table public.service_reviews 
add constraint check_communication_rating 
check (communication_rating is null or communication_rating in ('Excellent', 'Good', 'Average', 'Poor', 'Very Poor'));

alter table public.service_reviews 
add constraint check_customer_service_rating 
check (customer_service_rating is null or customer_service_rating in ('Excellent', 'Good', 'Average', 'Poor', 'Very Poor'));

alter table public.service_reviews 
add constraint check_delivery_on_time 
check (delivery_on_time is null or delivery_on_time in ('Yes', 'No'));

alter table public.service_reviews 
add constraint check_goods_condition 
check (goods_condition is null or goods_condition in ('Excellent', 'Good', 'Average', 'Poor', 'Very Poor'));

alter table public.service_reviews 
add constraint check_overall_satisfaction 
check (overall_satisfaction is null or overall_satisfaction in ('Very Satisfied', 'Satisfied', 'Neutral', 'Dissatisfied', 'Very Dissatisfied'));

alter table public.service_reviews 
add constraint check_is_first_time 
check (is_first_time is null or is_first_time in ('Yes', 'No'));

-- Update RLS policies to allow anonymous users to insert with new fields
drop policy if exists "Allow public inserts" on public.service_reviews;

create policy "Allow public inserts"
on public.service_reviews for insert to anon 
with check (true);

-- Create a view for admin dashboard to easily identify reviews needing attention
create or replace view public.reviews_needing_attention as
select 
  id,
  created_at,
  first_name,
  last_name,
  email,
  whatsapp_number,
  booking_ease,
  communication_rating,
  customer_service_rating,
  delivery_on_time,
  goods_condition,
  overall_satisfaction,
  follow_up_answers,
  additional_feedback,
  liked_most,
  can_improve
from public.service_reviews
where needs_admin_attention = true
order by created_at desc;

-- Grant access to the view
grant select on public.reviews_needing_attention to authenticated;
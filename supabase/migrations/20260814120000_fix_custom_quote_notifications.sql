-- Quote requests previously tried to notify a synthetic all-zero UUID. The
-- notifications table references auth.users, so that made every quote insert
-- fail inside the AFTER INSERT trigger. Notify each real admin profile instead.
create or replace function public.notify_new_custom_quote() returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notifications(user_id, title, message, type, related_id, is_read)
  select p.id,
         'New quote request',
         coalesce(left(new.description, 120), 'A customer') || ' — respond in Custom Quotes.',
         'quote_request',
         new.id,
         false
  from public.profiles p
  where p.is_admin = true or lower(coalesce(p.role, '')) = 'admin';

  if new.user_id is not null then
    insert into public.notifications(user_id, title, message, type, related_id)
    values (
      new.user_id,
      'Quote request received',
      'Our team is pricing your request and will reply shortly.',
      'quote',
      new.id
    );
  end if;

  return new;
end
$$;

drop trigger if exists custom_quote_admin_notification on public.custom_quotes;
create trigger custom_quote_admin_notification
after insert on public.custom_quotes
for each row execute function public.notify_new_custom_quote();

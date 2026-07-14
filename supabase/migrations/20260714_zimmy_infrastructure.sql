-- Shared analytics and guarded admin-action infrastructure for Zimmy.

create table if not exists public.zimmy_chat_events (
  id uuid primary key default gen_random_uuid(),
  conversation_id text not null,
  channel text not null default 'website',
  user_id uuid references auth.users(id) on delete set null,
  event_type text not null default 'message',
  intent text not null default 'general',
  request_text text,
  response_text text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists zimmy_chat_events_created_at_idx
  on public.zimmy_chat_events (created_at desc);
create index if not exists zimmy_chat_events_intent_idx
  on public.zimmy_chat_events (intent, created_at desc);
create index if not exists zimmy_chat_events_channel_idx
  on public.zimmy_chat_events (channel, created_at desc);

create table if not exists public.zimmy_admin_actions (
  id uuid primary key default gen_random_uuid(),
  requested_by uuid not null references auth.users(id) on delete cascade,
  action_type text not null,
  summary text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending'
    check (status in ('pending', 'executed', 'cancelled', 'expired', 'failed')),
  result jsonb,
  expires_at timestamptz not null default (now() + interval '15 minutes'),
  executed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists zimmy_admin_actions_user_status_idx
  on public.zimmy_admin_actions (requested_by, status, created_at desc);

alter table public.zimmy_chat_events enable row level security;
alter table public.zimmy_admin_actions enable row level security;

drop policy if exists "Admins can view Zimmy analytics" on public.zimmy_chat_events;
create policy "Admins can view Zimmy analytics"
  on public.zimmy_chat_events for select
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and (profiles.is_admin = true or profiles.role in ('admin', 'staff'))
    )
  );

drop policy if exists "Admins can view their Zimmy actions" on public.zimmy_admin_actions;
create policy "Admins can view their Zimmy actions"
  on public.zimmy_admin_actions for select
  using (
    requested_by = auth.uid()
    and exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and (profiles.is_admin = true or profiles.role in ('admin', 'staff'))
    )
  );

do $$
begin
  alter publication supabase_realtime add table public.zimmy_chat_events;
exception
  when duplicate_object then null;
end $$;

comment on table public.zimmy_chat_events is
  'Privacy-conscious interaction events used for Zimmy demand and service analytics.';
comment on table public.zimmy_admin_actions is
  'Short-lived, user-bound confirmations for Zimmy admin mutations.';

-- Persistent WhatsApp conversation ledger for the Twilio Sandbox and future
-- production senders. Edge functions write with the service role; staff can
-- read the inbox and take over a conversation through authenticated tools.

create table if not exists public.whatsapp_conversations (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'twilio',
  external_customer_id text not null,
  external_sender_id text not null,
  department text not null default 'general'
    check (department in ('general', 'bookings_uk', 'bookings_ie', 'finance')),
  customer_name text,
  status text not null default 'ai_active'
    check (status in ('ai_active', 'human_requested', 'human_active', 'closed')),
  summary text,
  assigned_to uuid references auth.users(id) on delete set null,
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, external_customer_id, external_sender_id)
);

create index if not exists whatsapp_conversations_inbox_idx
  on public.whatsapp_conversations(status, last_message_at desc);

create table if not exists public.whatsapp_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.whatsapp_conversations(id) on delete cascade,
  provider_message_sid text,
  direction text not null check (direction in ('inbound', 'outbound')),
  role text not null check (role in ('user', 'assistant', 'staff', 'system')),
  body text not null default '',
  media_count integer not null default 0,
  raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create unique index if not exists whatsapp_messages_provider_sid_key
  on public.whatsapp_messages(provider_message_sid)
  where provider_message_sid is not null;
create index if not exists whatsapp_messages_conversation_idx
  on public.whatsapp_messages(conversation_id, created_at desc);

alter table public.whatsapp_conversations enable row level security;
alter table public.whatsapp_messages enable row level security;

drop policy if exists "Staff read WhatsApp conversations" on public.whatsapp_conversations;
create policy "Staff read WhatsApp conversations" on public.whatsapp_conversations
  for select to authenticated using (public.is_staff_member());

drop policy if exists "Staff manage WhatsApp conversations" on public.whatsapp_conversations;
create policy "Staff manage WhatsApp conversations" on public.whatsapp_conversations
  for update to authenticated using (public.is_staff_member()) with check (public.is_staff_member());

drop policy if exists "Staff read WhatsApp messages" on public.whatsapp_messages;
create policy "Staff read WhatsApp messages" on public.whatsapp_messages
  for select to authenticated using (public.is_staff_member());

drop policy if exists "Staff send WhatsApp messages" on public.whatsapp_messages;
create policy "Staff send WhatsApp messages" on public.whatsapp_messages
  for insert to authenticated with check (public.is_staff_member() and role = 'staff');

create or replace function public.touch_whatsapp_conversation()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists whatsapp_conversations_touch on public.whatsapp_conversations;
create trigger whatsapp_conversations_touch
  before update on public.whatsapp_conversations
  for each row execute function public.touch_whatsapp_conversation();

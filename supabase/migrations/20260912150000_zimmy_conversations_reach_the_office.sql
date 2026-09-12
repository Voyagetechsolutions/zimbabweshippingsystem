-- Every Zimmy conversation becomes one row the office can work.
--
-- Capture used to be conditional on the model setting a flag, so a customer
-- could hand over a name, a number and a list of goods and leave no trace.
-- Between 14 July and 10 September that happened to 43 of the 51 booking
-- conversations, and it is worse than losing a row: `zimmy_chat_events`
-- redacts phone numbers and emails out of the transcript for analytics, so a
-- conversation that writes no request row leaves no way to reach the customer.
--
-- `conversation_id` lets one conversation own one request row that gets richer
-- as it goes, rather than a row per message flooding the inbox — or, worse,
-- the current situation where a long conversation produces nothing at all.

alter table public.customer_requests
  add column if not exists conversation_id text;

comment on column public.customer_requests.conversation_id is
  'The Zimmy conversation this request came from. One row per conversation: the '
  'AI upserts on it as more details arrive.';

-- Deliberately NOT a partial index. `on conflict (conversation_id)` needs a
-- plain unique index to infer an arbiter from; a partial one is rejected with
-- "there is no unique or exclusion constraint matching the ON CONFLICT
-- specification", which would have failed every upsert at runtime. Postgres
-- treats nulls as distinct in a unique index, so the 85 existing rows that
-- have no conversation are unaffected and any number of them may coexist.
create unique index if not exists customer_requests_one_row_per_conversation
  on public.customer_requests (conversation_id);

-- Finance answers the phone too. The only policy on this table requires
-- is_admin, so the finance account read back zero rows with no error — which
-- is a poor way to discover that nobody can see the enquiries.
drop policy if exists "Finance reads customer requests" on public.customer_requests;
create policy "Finance reads customer requests"
  on public.customer_requests for select
  to authenticated
  using (public.is_finance_staff());

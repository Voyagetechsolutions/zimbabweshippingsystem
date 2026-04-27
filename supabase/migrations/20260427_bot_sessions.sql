-- Persist WhatsApp bot sessions so they survive bot restarts and customers can
-- resume mid-booking. The bot keeps an in-memory cache (NodeCache) as L1 and
-- writes through to this table as L2.
--
-- Composite primary key (phone_number, bot_source) lets a single phone interact
-- with both regional bots independently. Same person, different sessions.

CREATE TABLE IF NOT EXISTS public.bot_sessions (
  phone_number TEXT NOT NULL,
  bot_source   TEXT NOT NULL, -- 'whatsapp-bot-ireland' | 'whatsapp-bot-uk'
  session_data JSONB NOT NULL,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (phone_number, bot_source)
);

CREATE INDEX IF NOT EXISTS idx_bot_sessions_updated_at
  ON public.bot_sessions(updated_at DESC);

ALTER TABLE public.bot_sessions ENABLE ROW LEVEL SECURITY;

-- The bots authenticate with the anon key (same as how shipments/payments are
-- written today), so we allow anon CRUD. Sessions only contain data the user
-- already gave to the bot, but treat the table as bot-internal storage.
DROP POLICY IF EXISTS "Bot session access" ON public.bot_sessions;
CREATE POLICY "Bot session access" ON public.bot_sessions
  FOR ALL
  USING (true)
  WITH CHECK (true);

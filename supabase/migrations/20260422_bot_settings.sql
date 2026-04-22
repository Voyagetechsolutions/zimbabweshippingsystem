-- WhatsApp Bot Settings Table
CREATE TABLE IF NOT EXISTS public.bot_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  value numeric NOT NULL,
  label text,
  description text,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.bot_settings ENABLE ROW LEVEL SECURITY;

-- Admins can read and write
CREATE POLICY "Admin full access on bot_settings" ON public.bot_settings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.is_admin = true
    )
  );

-- Bot (anon key) can read settings
CREATE POLICY "Public read bot_settings" ON public.bot_settings
  FOR SELECT USING (true);

-- Seed default pricing
INSERT INTO public.bot_settings (key, value, label, description) VALUES
  ('drum_price_1',      360, '1 Drum Price (€)',        'Price per drum when booking 1 drum'),
  ('drum_price_2_4',    350, '2–4 Drums Price (€)',     'Price per drum when booking 2–4 drums'),
  ('drum_price_5_plus', 340, '5+ Drums Price (€)',      'Price per drum when booking 5 or more drums'),
  ('box_price_1',       220, '1 Box Price (€)',         'Price per box when booking 1 box'),
  ('box_price_2_4',     210, '2–4 Boxes Price (€)',     'Price per box when booking 2–4 boxes'),
  ('box_price_5_plus',  200, '5+ Boxes Price (€)',      'Price per box when booking 5 or more boxes'),
  ('seal_price',          7, 'Metal Seal Price (€)',    'Price per seal — charged per drum/box'),
  ('door_to_door_price', 25, 'Door-to-Door Price (€)',  'Additional charge for door-to-door delivery in Zimbabwe')
ON CONFLICT (key) DO NOTHING;

-- =====================================================
-- WhatsApp Bot Messages Table
-- =====================================================
CREATE TABLE IF NOT EXISTS public.bot_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  label text NOT NULL,
  message text NOT NULL,
  description text,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.bot_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access on bot_messages" ON public.bot_messages
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.is_admin = true
    )
  );

CREATE POLICY "Public read bot_messages" ON public.bot_messages
  FOR SELECT USING (true);

INSERT INTO public.bot_messages (key, label, message, description) VALUES
  ('welcome',              'Welcome Message',          E'🇮🇪 *Welcome to Zimbabwe Shipping*\n_Ireland Branch_\n\nThank you for contacting us. We''re ready to assist you.\n\n📢 *Collections in Ireland begin August 2026*\n\nTap the button below to get started.',  'First message new users see'),
  ('collection_notice',    'Collection Notice',        '📢 Collections commence in *August 2026*',  'Shown in main menu header'),
  ('tracking_prompt',      'Tracking Prompt',          E'🔍 *Track Your Shipment*\n\nPlease enter your tracking number (e.g., ZS-ABC12345):',  'Shown when user selects Track'),
  ('contact',              'Speak to Agent Message',   E'🧑‍💼 *Speak to an Agent*\n\nPlease press the 📞 *call icon* and click *Voice Call* to speak to one of our agents.\n\n⏱️ *Response times:*\n• Off-peak: 0–15 minutes\n• Peak times: 30–45 minutes\n\nType *menu* to return to the main menu.',  'Shown when user selects Speak to Agent'),
  ('faq_redirect',         'FAQ Redirect Message',     E'❓ *FAQ & Help*\n\nFor answers to common questions, please visit our FAQ page:\n\n🌐 https://zimbabweshipping.com/faq\n\nType *menu* to return to the main menu.',  'Shown when user selects FAQ'),
  ('booking_intro',        'Booking Intro Message',    E'📦 *Start Your Booking*\n\nHere''s what we''ll need from you:\n\n• Your full name, phone & email\n• Your collection address in Ireland\n• Receiver''s details in Zimbabwe\n• What you''re sending (drums / boxes)\n\nThis will only take a minute.\n\n➡️ *Please type your full name*\n\n_Type_ cancel _anytime to return to the main menu._',  'Shown at start of booking flow'),
  ('booking_confirmed',    'Booking Confirmed Message',E'🎉 *Booking Confirmed!*\n\n✅ Your tracking number: *{tracking_number}*\n\n📧 Confirmation sent to {email}\n\n📞 We''ll contact you within 24 hours to confirm your collection date.\n\n📢 *Collections commence August 2026*\n\nType *track* to track your shipment or *menu* for main menu.',  'Sent after booking is confirmed. Use {tracking_number} and {email} as placeholders'),
  ('shipment_status_update','Status Update Message',   E'📦 *Shipment Update*\n\nYour shipment *{tracking_number}* has been updated.\n\n📍 New status: *{status}*\n\nType *track* and enter your tracking number for full details.',  'Sent when admin updates shipment status. Use {tracking_number} and {status} as placeholders')
ON CONFLICT (key) DO NOTHING;

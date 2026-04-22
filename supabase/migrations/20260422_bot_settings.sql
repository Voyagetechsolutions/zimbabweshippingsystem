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

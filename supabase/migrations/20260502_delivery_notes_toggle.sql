-- Feature toggle: when 1, the WhatsApp bot prompts the customer for a
-- free-text delivery note during booking and stores it on the shipment.
INSERT INTO public.bot_settings (key, value, label, description) VALUES
  ('delivery_notes_enabled', 0, 'Enable Delivery Notes',
   'When enabled, the bot asks customers for delivery instructions during booking and stores them on the shipment.')
ON CONFLICT (key) DO NOTHING;

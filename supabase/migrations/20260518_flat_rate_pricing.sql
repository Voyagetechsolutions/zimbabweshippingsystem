-- Flatten all volume-based pricing to flat rates.
-- UK: £280/drum | Ireland: €360/drum, €220/trunk
-- No more 2-4 or 5+ tier discounts.

UPDATE public.bot_settings SET value = 360, label = 'Drum Price (€)', description = 'Price per drum (flat rate)' WHERE key = 'drum_price_1';
UPDATE public.bot_settings SET value = 360, label = '2–4 Drums Price (€)', description = 'Price per drum (flat rate, kept for compatibility)' WHERE key = 'drum_price_2_4';
UPDATE public.bot_settings SET value = 360, label = '5+ Drums Price (€)', description = 'Price per drum (flat rate, kept for compatibility)' WHERE key = 'drum_price_5_plus';
UPDATE public.bot_settings SET value = 220, label = 'Box Price (€)', description = 'Price per box (flat rate)' WHERE key = 'box_price_1';
UPDATE public.bot_settings SET value = 220, label = '2–4 Boxes Price (€)', description = 'Price per box (flat rate, kept for compatibility)' WHERE key = 'box_price_2_4';
UPDATE public.bot_settings SET value = 220, label = '5+ Boxes Price (€)', description = 'Price per box (flat rate, kept for compatibility)' WHERE key = 'box_price_5_plus';

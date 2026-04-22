import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

// Default messages — used as fallback if DB unavailable
const DEFAULTS = {
  welcome:
    `🇮🇪 *Welcome to Zimbabwe Shipping*\n_Ireland Branch_\n\nThank you for contacting us. We're ready to assist you.\n\n📢 *Collections in Ireland begin August 2026*\n\nTap the button below to get started.`,

  collection_notice:
    `📢 Collections commence in *August 2026*`,

  tracking_prompt:
    `🔍 *Track Your Shipment*\n\nPlease enter your tracking number (e.g., ZS-ABC12345):`,

  contact:
    `🧑‍💼 *Speak to an Agent*\n\nPlease press the 📞 *call icon* and click *Voice Call* to speak to one of our agents.\n\n⏱️ *Response times:*\n• Off-peak: 0–15 minutes\n• Peak times: 30–45 minutes\n\nType *menu* to return to the main menu.`,

  faq_redirect:
    `❓ *FAQ & Help*\n\nFor answers to common questions, please visit our FAQ page:\n\n🌐 https://zimbabweshipping.com/faq\n\nType *menu* to return to the main menu.`,

  booking_intro:
    `📦 *Start Your Booking*\n\nHere's what we'll need from you:\n\n• Your full name, phone & email\n• Your collection address in Ireland\n• Receiver's details in Zimbabwe\n• What you're sending (drums / boxes)\n\nThis will only take a minute.\n\n➡️ *Please type your full name*\n\n_Type_ cancel _anytime to return to the main menu._`,

  booking_confirmed:
    `🎉 *Booking Confirmed!*\n\n✅ Your tracking number: *{tracking_number}*\n\n📧 Confirmation sent to {email}\n\n📞 We'll contact you within 24 hours to confirm your collection date.\n\n📢 *Collections commence August 2026*\n\nType *track* to track your shipment or *menu* for main menu.`,

  shipment_status_update:
    `📦 *Shipment Update*\n\nYour shipment *{tracking_number}* has been updated.\n\n📍 New status: *{status}*\n\nType *track* and enter your tracking number for full details.`,
};

let _cache = null;
let _cacheExpiry = 0;
const CACHE_TTL = 5 * 60 * 1000;

export async function getBotMessage(key) {
  const messages = await getAllBotMessages();
  return messages[key] ?? DEFAULTS[key] ?? '';
}

export async function getAllBotMessages() {
  const now = Date.now();
  if (_cache && now < _cacheExpiry) return _cache;

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
    return DEFAULTS;
  }

  try {
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
    const { data, error } = await supabase
      .from('bot_messages')
      .select('key, message');

    if (error || !data?.length) return DEFAULTS;

    const result = { ...DEFAULTS };
    for (const row of data) result[row.key] = row.message;

    _cache = result;
    _cacheExpiry = now + CACHE_TTL;
    return result;
  } catch {
    return DEFAULTS;
  }
}

export function invalidateBotMessageCache() {
  _cache = null;
  _cacheExpiry = 0;
}

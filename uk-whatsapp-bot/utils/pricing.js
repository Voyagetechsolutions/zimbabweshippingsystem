import { getSupabase } from './database.js';

// UK pricing — mirrors the website (SimplifiedBookingForm).
// Hardcoded so it can't be overridden by Ireland's bot_settings rows.
// Only `delivery_notes_enabled` is read from the shared bot_settings table.
const UK_PRICING = {
  drum_price_1: 280,
  drum_price_2_4: 270,
  drum_price_5_plus: 260,
  purchase_drum_metal: 40,
  purchase_drum_plastic: 50,
};

export const CURRENCY = 'GBP';
export const CURRENCY_SYMBOL = '£';
export const COUNTRY = 'England';
export const CASH_DISCOUNT_PER_DRUM = 0;
export const PAY_ON_ARRIVAL_MULTIPLIER = 1.20;

let cachedSettings = null;
let cacheExpiry = 0;
const CACHE_TTL = 5 * 60 * 1000;

export async function getBotSettings() {
  const now = Date.now();
  if (cachedSettings && now < cacheExpiry) return cachedSettings;

  // Start with hardcoded UK pricing (never overridden by DB).
  const settings = { ...UK_PRICING };

  // Pull only feature toggles from DB (e.g. delivery_notes_enabled).
  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data } = await supabase.from('bot_settings').select('key, value');
      for (const row of data || []) {
        if (row.key === 'delivery_notes_enabled') {
          settings[row.key] = row.value;
        }
      }
    } catch (err) {
      console.warn('Could not read bot toggles:', err.message);
    }
  }

  cachedSettings = settings;
  cacheExpiry = now + CACHE_TTL;
  return settings;
}

const DEFAULTS = UK_PRICING;

export function getDrumPrice(quantity, settings = DEFAULTS) {
  if (quantity >= 5) return settings.drum_price_5_plus;
  if (quantity >= 2) return settings.drum_price_2_4;
  return settings.drum_price_1;
}

export function getPurchaseDrumPrice(type, settings = DEFAULTS) {
  if (type === 'metal') return settings.purchase_drum_metal;
  if (type === 'plastic') return settings.purchase_drum_plastic;
  return 0;
}

export function calculatePricing(bookingData, settings = DEFAULTS) {
  const drumQty = bookingData.includeDrums ? (bookingData.drumQuantity || 0) : 0;
  const drumUnit = drumQty > 0 ? getDrumPrice(drumQty, settings) : 0;
  const drumTotal = drumQty * drumUnit;

  let purchaseDrumQty = 0;
  let purchaseDrumUnit = 0;
  let purchaseDrumTotal = 0;
  if (bookingData.purchaseDrums && bookingData.purchaseDrumType) {
    purchaseDrumQty = bookingData.purchaseDrumQuantity || 0;
    purchaseDrumUnit = getPurchaseDrumPrice(bookingData.purchaseDrumType, settings);
    purchaseDrumTotal = purchaseDrumQty * purchaseDrumUnit;
  }

  const baseTotal = drumTotal + purchaseDrumTotal;

  let finalTotal = baseTotal;
  let cashDiscount = 0;
  let payOnArrivalPremium = 0;

  if (bookingData.paymentMethod === 'payOnArrival') {
    finalTotal = baseTotal * PAY_ON_ARRIVAL_MULTIPLIER;
    payOnArrivalPremium = finalTotal - baseTotal;
  }

  return {
    drumQty, drumUnit, drumTotal,
    purchaseDrumQty, purchaseDrumUnit, purchaseDrumTotal,
    purchaseDrumType: bookingData.purchaseDrumType || null,
    baseTotal, cashDiscount, payOnArrivalPremium, finalTotal,
    currency: CURRENCY, currencySymbol: CURRENCY_SYMBOL,
  };
}

export function formatMoney(amount) {
  return `${CURRENCY_SYMBOL}${Number(amount).toFixed(2)}`;
}

export async function getPricingMessage() {
  const s = await getBotSettings();
  return `💰 *UK Pricing (GBP)*

*DRUMS (200–220L):*
🥁 1 drum: ${formatMoney(s.drum_price_1)}
🥁 2–4 drums: ${formatMoney(s.drum_price_2_4)} each
🥁 5+ drums: ${formatMoney(s.drum_price_5_plus)} each (best value!)

*NEED TO PURCHASE A DRUM?*
🛢️ Metal Drum: ${formatMoney(s.purchase_drum_metal)} each
🛢️ Plastic Barrel: ${formatMoney(s.purchase_drum_plastic)} each

*OTHER ITEMS:*
📋 Custom items quoted individually by our agent.

*INCLUDED FREE:*
✅ Collection anywhere in England
✅ Full tracking
✅ 6–8 weeks delivery

*PAYMENT OPTIONS:*
💳 Card / bank transfer
💵 Cash on Collection
⏳ Pay on Arrival (+20% premium)

Type *book* to start booking or *menu* for main menu.`;
}

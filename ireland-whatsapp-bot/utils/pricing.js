import { getSupabase } from './database.js';

// Ireland pricing — drums and supplied drums only (mirrors UK bot structure).
// Hardcoded so the Ireland bot is independent of the UK rows in bot_settings.
// Only feature toggles like `delivery_notes_enabled` are read from the DB.
const IRELAND_PRICING = {
  drum_price_1: 360,
  drum_price_2_4: 350,
  drum_price_5_plus: 340,
  purchase_drum_metal: 50,
  purchase_drum_plastic: 60,
};

export const CURRENCY = 'EUR';
export const CURRENCY_SYMBOL = '€';
export const COUNTRY = 'Ireland';
export const CASH_DISCOUNT_PER_DRUM = 20;
export const PAY_ON_ARRIVAL_MULTIPLIER = 1.20;

let cachedSettings = null;
let cacheExpiry = 0;
const CACHE_TTL = 5 * 60 * 1000;

export async function getBotSettings() {
  const now = Date.now();
  if (cachedSettings && now < cacheExpiry) return cachedSettings;

  const settings = { ...IRELAND_PRICING };

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

const DEFAULTS = IRELAND_PRICING;

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

  if (bookingData.paymentMethod === 'cashOnCollection' && drumQty > 0) {
    cashDiscount = drumQty * CASH_DISCOUNT_PER_DRUM;
    finalTotal = baseTotal - cashDiscount;
  } else if (bookingData.paymentMethod === 'payOnArrival') {
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
  return `${CURRENCY_SYMBOL}${Number(amount).toFixed(0)}`;
}

export async function getPricingMessage() {
  const s = await getBotSettings();
  return `💰 *Ireland Pricing (EUR)*

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
✅ Collection anywhere in Ireland
✅ Full tracking
✅ 6–8 weeks delivery

*PAYMENT OPTIONS:*
💳 Standard payment (card / bank transfer)
💵 Cash on Collection (save ${CURRENCY_SYMBOL}${CASH_DISCOUNT_PER_DRUM} per drum)
⏳ Pay on Arrival (+20% premium)

Type *book* to start booking or *menu* for main menu.`;
}

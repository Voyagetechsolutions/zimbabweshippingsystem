/**
 * Pricing Utilities
 * Fetches pricing from database and calculates totals
 */

import { getSupabase } from './database.js';

// Default prices (fallback if database unavailable)
const DEFAULTS = {
  drum_price_1: 360,
  drum_price_2_4: 350,
  drum_price_5_plus: 340,
  box_price_1: 220,
  box_price_2_4: 210,
  box_price_5_plus: 200,
  seal_price: 7,
};

export const CURRENCY_SYMBOL = '€';
export const CASH_DISCOUNT_PER_DRUM = 20;
export const PAY_ON_ARRIVAL_MULTIPLIER = 1.20;

let cachedSettings = null;
let cacheExpiry = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get bot settings from database (with caching)
 */
export async function getBotSettings() {
  const now = Date.now();
  
  // Return cached if still valid
  if (cachedSettings && now < cacheExpiry) {
    return cachedSettings;
  }
  
  const supabase = getSupabase();
  if (!supabase) {
    console.log('📊 Using default pricing (no database)');
    return DEFAULTS;
  }
  
  try {
    const { data, error } = await supabase
      .from('bot_settings')
      .select('key, value');
    
    if (error || !data?.length) {
      console.log('📊 Using default pricing (database error)');
      return DEFAULTS;
    }
    
    // Build settings object
    const settings = { ...DEFAULTS };
    for (const row of data) {
      settings[row.key] = row.value;
    }
    
    // Cache the result
    cachedSettings = settings;
    cacheExpiry = now + CACHE_TTL;
    
    console.log('📊 Pricing loaded from database');
    return settings;
  } catch (err) {
    console.error('❌ Failed to load pricing:', err.message);
    return DEFAULTS;
  }
}

/**
 * Get drum price based on quantity
 */
export function getDrumPrice(quantity, settings = DEFAULTS) {
  if (quantity >= 5) return settings.drum_price_5_plus;
  if (quantity >= 2) return settings.drum_price_2_4;
  return settings.drum_price_1;
}

/**
 * Get trunk/box price based on quantity
 */
export function getTrunkPrice(quantity, settings = DEFAULTS) {
  if (quantity >= 5) return settings.box_price_5_plus;
  if (quantity >= 2) return settings.box_price_2_4;
  return settings.box_price_1;
}

/**
 * Get metal seal price
 */
export function getSealPrice(settings = DEFAULTS) {
  return settings.seal_price;
}

/**
 * Calculate complete pricing for booking
 */
export function calculatePricing(bookingData, settings = DEFAULTS) {
  // Drums
  const drumQty = bookingData.drumQuantity || 0;
  const drumUnit = drumQty > 0 ? getDrumPrice(drumQty, settings) : 0;
  const drumTotal = drumQty * drumUnit;
  
  // Trunks
  const trunkQty = bookingData.trunkQuantity || 0;
  const trunkUnit = trunkQty > 0 ? getTrunkPrice(trunkQty, settings) : 0;
  const trunkTotal = trunkQty * trunkUnit;
  
  // Metal seals (applies to drums + trunks if selected)
  let sealQty = 0;
  if (bookingData.wantMetalSeal) {
    sealQty = drumQty + trunkQty;
  }
  const sealUnit = getSealPrice(settings);
  const sealCost = sealQty * sealUnit;
  
  // Base total
  const baseTotal = drumTotal + trunkTotal + sealCost;
  
  // Apply payment method adjustments
  let finalTotal = baseTotal;
  let cashDiscount = 0;
  let payOnArrivalPremium = 0;
  
  if (bookingData.paymentMethod === 'cashOnCollection' && drumQty > 0) {
    cashDiscount = drumQty * CASH_DISCOUNT_PER_DRUM;
    finalTotal = baseTotal - cashDiscount;
  } else if (bookingData.paymentMethod === 'payOnArrival') {
    payOnArrivalPremium = baseTotal * (PAY_ON_ARRIVAL_MULTIPLIER - 1);
    finalTotal = baseTotal + payOnArrivalPremium;
  }
  
  return {
    drumQty,
    drumUnit,
    drumTotal,
    trunkQty,
    trunkUnit,
    trunkTotal,
    sealQty,
    sealUnit,
    sealCost,
    baseTotal,
    cashDiscount,
    payOnArrivalPremium,
    finalTotal,
  };
}

/**
 * Format money amount
 */
export function formatMoney(amount) {
  return `${CURRENCY_SYMBOL}${Number(amount).toFixed(0)}`;
}

/**
 * Get pricing message for display
 */
export async function getPricingMessage() {
  const settings = await getBotSettings();
  
  return `💰 *Ireland Pricing (EUR)*

*DRUM SHIPPING (200-220L):*
🥁 5+ drums: ${formatMoney(settings.drum_price_5_plus)} per drum
🥁 2-4 drums: ${formatMoney(settings.drum_price_2_4)} per drum
🥁 1 drum: ${formatMoney(settings.drum_price_1)} per drum

*TRUNK/STORAGE BOX SHIPPING:*
📦 5+ items: ${formatMoney(settings.box_price_5_plus)} per item
📦 2-4 items: ${formatMoney(settings.box_price_2_4)} per item
📦 1 item: ${formatMoney(settings.box_price_1)} per item

*ADDITIONAL SERVICES:*
🔒 Metal Coded Seal: ${formatMoney(settings.seal_price)} per item

*WHAT'S INCLUDED:*
✅ FREE collection anywhere in Ireland
✅ Full tracking
✅ 6–8 weeks delivery
✅ Professional handling

*PAYMENT OPTIONS:*
💳 Standard payment (card / bank transfer)
💵 Cash on Collection (save €${CASH_DISCOUNT_PER_DRUM} per drum)
⏳ Pay on Arrival (+20% premium)

Type *book* to start booking or *menu* for main menu.`;
}

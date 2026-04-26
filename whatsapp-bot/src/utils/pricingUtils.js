import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

// Defaults match the website (SimplifiedBookingForm) for Ireland.
const DEFAULTS = {
  drum_price_1: 360,
  drum_price_2_4: 350,
  drum_price_5_plus: 340,
  box_price_1: 220,        // trunk / storage box
  box_price_2_4: 210,
  box_price_5_plus: 200,
  seal_price: 7,
  door_to_door_price: 25,
};

export const CURRENCY = 'EUR';
export const CURRENCY_SYMBOL = '€';
export const COUNTRY = 'Ireland';
export const CASH_DISCOUNT_PER_DRUM = 20;
export const PAY_ON_ARRIVAL_MULTIPLIER = 1.20;

let _cachedSettings = null;
let _cacheExpiry = 0;
const CACHE_TTL_MS = 5 * 60 * 1000;

export async function getBotSettings() {
  const now = Date.now();
  if (_cachedSettings && now < _cacheExpiry) return _cachedSettings;

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
    return DEFAULTS;
  }

  try {
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
    const { data, error } = await supabase
      .from('bot_settings')
      .select('key, value');

    if (error || !data?.length) return DEFAULTS;

    const settings = { ...DEFAULTS };
    for (const row of data) settings[row.key] = row.value;

    _cachedSettings = settings;
    _cacheExpiry = now + CACHE_TTL_MS;
    return settings;
  } catch {
    return DEFAULTS;
  }
}

export function getDrumPrice(quantity, settings = DEFAULTS) {
  if (quantity >= 5) return settings.drum_price_5_plus;
  if (quantity >= 2) return settings.drum_price_2_4;
  return settings.drum_price_1;
}

export function getTrunkPrice(quantity, settings = DEFAULTS) {
  if (quantity >= 5) return settings.box_price_5_plus;
  if (quantity >= 2) return settings.box_price_2_4;
  return settings.box_price_1;
}

export function getMetalSealPrice(settings = DEFAULTS) {
  return settings.seal_price;
}

// Mirrors SimplifiedBookingForm.calculateBaseTotal / calculateFinalTotal.
export function calculatePricing(bookingData, settings = DEFAULTS) {
  const drumQty = bookingData.includeDrums ? (bookingData.drumQuantity || 0) : 0;
  const trunkQty = bookingData.includeTrunks ? (bookingData.trunkQuantity || 0) : 0;
  const sealUnit = getMetalSealPrice(settings);

  const drumUnit = drumQty > 0 ? getDrumPrice(drumQty, settings) : 0;
  const drumTotal = drumQty * drumUnit;

  const trunkUnit = trunkQty > 0 ? getTrunkPrice(trunkQty, settings) : 0;
  const trunkTotal = trunkQty * trunkUnit;

  // Metal seal applies to drums and/or trunks when selected.
  let sealQty = 0;
  if (bookingData.wantMetalSeal) {
    if (drumQty > 0) sealQty += drumQty;
    if (trunkQty > 0) sealQty += trunkQty;
  }
  const sealCost = sealQty * sealUnit;

  const baseTotal = drumTotal + trunkTotal + sealCost;

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
    currency: CURRENCY,
    currencySymbol: CURRENCY_SYMBOL,
  };
}

export function formatMoney(amount) {
  return `${CURRENCY_SYMBOL}${Number(amount).toFixed(2)}`;
}

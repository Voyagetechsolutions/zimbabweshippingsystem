import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

// Default pricing — used as fallback if DB is unavailable
const DEFAULTS = {
  drum_price_1: 360,
  drum_price_2_4: 350,
  drum_price_5_plus: 340,
  box_price_1: 220,
  box_price_2_4: 210,
  box_price_5_plus: 200,
  seal_price: 7,
  door_to_door_price: 25,
};

let _cachedSettings = null;
let _cacheExpiry = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

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

    if (error || !data?.length) {
      return DEFAULTS;
    }

    const settings = { ...DEFAULTS };
    for (const row of data) {
      settings[row.key] = row.value;
    }

    _cachedSettings = settings;
    _cacheExpiry = now + CACHE_TTL_MS;
    return settings;
  } catch {
    return DEFAULTS;
  }
}

export function calculatePrice(bookingData, settings = DEFAULTS) {
  const drums = bookingData.drums || 0;
  const boxes = bookingData.boxes || 0;

  let drumPrice = settings.drum_price_1;
  if (drums >= 5) drumPrice = settings.drum_price_5_plus;
  else if (drums >= 2) drumPrice = settings.drum_price_2_4;

  let boxPrice = settings.box_price_1;
  if (boxes >= 5) boxPrice = settings.box_price_5_plus;
  else if (boxes >= 2) boxPrice = settings.box_price_2_4;

  const drumTotal = drums * drumPrice;
  const boxTotal = boxes * boxPrice;

  // Seals charged per item (drum + box count)
  const sealQty = bookingData.metalSeal ? (drums + boxes) : 0;
  const sealCost = sealQty * (settings.seal_price || 7);
  const doorToDoorCost = bookingData.doorToDoor ? (settings.door_to_door_price || 25) : 0;

  const subtotal = drumTotal + boxTotal;
  const total = subtotal + sealCost + doorToDoorCost;

  return {
    drumPrice,
    boxPrice,
    drumTotal,
    boxTotal,
    sealQty,
    sealCost,
    doorToDoorCost,
    subtotal,
    total
  };
}

export function formatCurrency(amount, currency = 'EUR') {
  return new Intl.NumberFormat('en-IE', { style: 'currency', currency }).format(amount);
}

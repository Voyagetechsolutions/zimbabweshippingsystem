import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { CURRENCY, COUNTRY } from '../utils/pricingUtils.js';

dotenv.config();

let supabase = null;

export function initializeDatabase() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
    console.warn('⚠️  Supabase credentials not found. Database features will be limited.');
    return;
  }

  supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
  console.log('✅ Database connection initialized');
}

export function getSupabase() {
  return supabase;
}

function generateTrackingNumber() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = 'ZS-';
  for (let i = 0; i < 8; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
  return result;
}

function generateReceiptNumber(timestamp) {
  return `RCP-${String(timestamp).slice(-10)}`;
}

function generateTransactionId(timestamp) {
  return `TX-${String(timestamp).slice(-12)}`;
}

async function findCollectionScheduleId(route, date) {
  if (!route || !supabase) return null;
  try {
    const { data } = await supabase
      .from('collection_schedules')
      .select('id')
      .eq('route', route)
      .eq('pickup_date', date)
      .maybeSingle();
    return data?.id || null;
  } catch {
    return null;
  }
}

async function ensureProfileFor(email, fullName, profileIdFallback) {
  if (!supabase || !email) return;
  try {
    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (!existing) {
      await supabase
        .from('profiles')
        .insert({
          id: profileIdFallback,
          email,
          full_name: fullName,
          role: 'customer',
          is_admin: false,
        });
    }
  } catch (err) {
    console.warn('Profile upsert skipped:', err?.message || err);
  }
}

// Mirrors the website's submit handler: shipments + payments + receipts + profile.
export async function createBookingRecords(phoneNumber, bookingData, pricing) {
  if (!supabase) {
    console.error('Database not initialized — returning fallback tracking number');
    return { trackingNumber: generateTrackingNumber(), receiptNumber: null };
  }

  const trackingNumber = generateTrackingNumber();
  const timestamp = Date.now();
  const receiptNumber = generateReceiptNumber(timestamp);
  const transactionId = generateTransactionId(timestamp);

  const isOtherItemsOnly =
    bookingData.includeBoxes &&
    !bookingData.includeDrums &&
    !bookingData.includeTrunks;

  const sender = {
    firstName: bookingData.senderFirstName,
    lastName: bookingData.senderLastName,
    email: bookingData.senderEmail,
    phone: bookingData.senderPhone,
    phone2: bookingData.senderPhone2 || null,
    address: bookingData.senderAddress,
    city: bookingData.senderCity,
    postcode: bookingData.senderPostcode || 'N/A',
    country: COUNTRY,
  };

  const recipient = {
    name: bookingData.receiverName,
    phone: bookingData.receiverPhone,
    phone2: bookingData.receiverPhone2 || null,
    address: bookingData.receiverAddress,
    city: bookingData.receiverCity,
    country: 'Zimbabwe',
  };

  const items = {
    drums: bookingData.includeDrums
      ? {
          quantity: pricing.drumQty,
          pricePerDrum: pricing.drumUnit,
          totalPrice: pricing.drumTotal,
          currency: CURRENCY,
          description: bookingData.drumsDescription || null,
        }
      : null,
    trunks: bookingData.includeTrunks
      ? {
          quantity: pricing.trunkQty,
          pricePerTrunk: pricing.trunkUnit,
          totalPrice: pricing.trunkTotal,
          currency: CURRENCY,
          description: bookingData.trunksDescription || null,
        }
      : null,
    boxes: bookingData.includeBoxes
      ? { description: bookingData.boxesDescription }
      : null,
    addOns: {
      metalSeal: !!bookingData.wantMetalSeal,
      metalSealPrice: pricing.sealUnit,
    },
    purchasedDrums: null, // UK-only feature; not used in Ireland bot
  };

  const notes = [];
  if (bookingData.wantMetalSeal) notes.push('Metal Coded Seal requested');
  if (bookingData.paymentMethod === 'cashOnCollection') notes.push('Cash payment on collection');
  if (bookingData.includeBoxes) notes.push(`Other Items (agent quote): ${bookingData.boxesDescription}`);
  if (bookingData.includeTrunks && bookingData.trunkQuantity > 0) {
    notes.push(`${bookingData.trunkQuantity} x Trunk/Storage Box`);
  }

  const types = [];
  if (bookingData.includeDrums) types.push('Drums');
  if (bookingData.includeTrunks) types.push('Trunks');
  if (bookingData.includeBoxes) types.push('Other Items');

  const shipmentMetadata = {
    sender,
    recipient,
    items,
    pricing: {
      baseAmount: pricing.baseTotal,
      finalAmount: pricing.finalTotal,
      paymentMethod: bookingData.paymentMethod,
      currency: CURRENCY,
    },
    collection: {
      route: bookingData.collectionRoute || null,
      date: bookingData.collectionDate || null,
    },
    paymentSchedule: null,
    shipmentDetails: {
      type: types.length ? types.join(' + ') : 'Standard',
      includeDrums: !!bookingData.includeDrums,
      drumQuantity: bookingData.drumQuantity || 0,
      drumsDescription: bookingData.drumsDescription || null,
      includeTrunks: !!bookingData.includeTrunks,
      trunkQuantity: bookingData.trunkQuantity || 0,
      trunksDescription: bookingData.trunksDescription || null,
      includeOtherItems: !!bookingData.includeBoxes,
      wantMetalSeal: !!bookingData.wantMetalSeal,
      category: bookingData.boxesDescription || null,
    },
    notes: notes.length ? notes.join(' | ') : null,
    bookingSource: 'whatsapp-bot-ireland',
    whatsappNumber: phoneNumber,
    createdAt: new Date(timestamp).toISOString(),
  };

  const collectionScheduleId = await findCollectionScheduleId(
    bookingData.collectionRoute,
    bookingData.collectionDate,
  );

  // 1. shipments
  const { data: shipmentRow, error: shipmentErr } = await supabase
    .from('shipments')
    .insert({
      tracking_number: trackingNumber,
      user_id: null,
      origin: `${bookingData.senderCity}, ${COUNTRY}`,
      destination: `${bookingData.receiverCity}, Zimbabwe`,
      status: isOtherItemsOnly ? 'Awaiting Quote' : 'pending',
      metadata: shipmentMetadata,
      collection_schedule_id: collectionScheduleId,
      can_modify: true,
      can_cancel: true,
    })
    .select()
    .single();

  if (shipmentErr) {
    console.error('Error creating shipment:', shipmentErr);
    throw shipmentErr;
  }

  // 2. payments
  const { data: paymentRow, error: paymentErr } = await supabase
    .from('payments')
    .insert({
      user_id: null,
      shipment_id: shipmentRow.id,
      amount: pricing.finalTotal,
      currency: CURRENCY,
      payment_method: bookingData.paymentMethod,
      payment_status: 'pending',
      transaction_id: transactionId,
    })
    .select()
    .single();

  if (paymentErr) {
    console.error('Error creating payment:', paymentErr);
    throw paymentErr;
  }

  // 3. receipts
  const { error: receiptErr } = await supabase
    .from('receipts')
    .insert({
      user_id: null,
      shipment_id: shipmentRow.id,
      payment_id: paymentRow.id,
      receipt_number: receiptNumber,
      amount: pricing.finalTotal,
      currency: CURRENCY,
      payment_method: bookingData.paymentMethod,
      status: 'pending',
      sender_details: sender,
      recipient_details: recipient,
      shipment_details: items,
      payment_info: {
        paymentMethod: bookingData.paymentMethod,
        baseAmount: pricing.baseTotal,
        finalAmount: pricing.finalTotal,
        transactionId,
        usePaymentSchedule: false,
        paymentSchedule: null,
      },
      collection_info: {
        pickupAddress: `${bookingData.senderAddress}, ${bookingData.senderCity}, ${bookingData.senderPostcode || 'N/A'}`,
        deliveryAddress: `${bookingData.receiverAddress}, ${bookingData.receiverCity}, Zimbabwe`,
        route: bookingData.collectionRoute || null,
        collectionDate: bookingData.collectionDate || null,
      },
      payment_schedule: null,
    });

  if (receiptErr) {
    console.error('Error creating receipt:', receiptErr);
    // Non-fatal — booking succeeded, just no receipt row.
  }

  // 4. profile (best-effort)
  const fullName = `${bookingData.senderFirstName || ''} ${bookingData.senderLastName || ''}`.trim();
  await ensureProfileFor(bookingData.senderEmail, fullName, shipmentRow.id);

  console.log('✅ Booking created:', trackingNumber, '/', receiptNumber);
  return { trackingNumber, receiptNumber };
}

export async function getShipmentByTracking(trackingNumber) {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('shipments')
      .select('*')
      .eq('tracking_number', trackingNumber)
      .single();
    if (error) return null;
    return data;
  } catch {
    return null;
  }
}

export async function updateShipmentStatus(trackingNumber, status) {
  if (!supabase) return false;
  try {
    const { error } = await supabase
      .from('shipments')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('tracking_number', trackingNumber);
    return !error;
  } catch {
    return false;
  }
}

export async function getShipmentsByPhone(phoneNumber) {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from('shipments')
      .select('*')
      .contains('metadata', { whatsappNumber: phoneNumber })
      .order('created_at', { ascending: false });
    if (error) return [];
    return data || [];
  } catch {
    return [];
  }
}

export async function getBotSettingsFromDB() {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.from('bot_settings').select('key, value');
    if (error) return null;
    const result = {};
    for (const row of data) result[row.key] = row.value;
    return result;
  } catch {
    return null;
  }
}

export async function saveBotSetting(key, value) {
  if (!supabase) return false;
  try {
    const { error } = await supabase
      .from('bot_settings')
      .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' });
    return !error;
  } catch {
    return false;
  }
}

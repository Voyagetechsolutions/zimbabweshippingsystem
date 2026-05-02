import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const COUNTRY = 'Ireland';
const CURRENCY = 'EUR';

let supabaseClient = null;

export function getSupabase() {
  if (supabaseClient) return supabaseClient;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  if (!url || !key) {
    console.warn('Supabase credentials not found. Database features disabled.');
    return null;
  }
  supabaseClient = createClient(url, key);
  console.log('Supabase connected');
  return supabaseClient;
}

export async function initDatabase() {
  const supabase = getSupabase();
  if (!supabase) return false;
  try {
    const { error } = await supabase.from('bot_settings').select('key').limit(1);
    if (error) {
      console.error('Database connection failed:', error.message);
      return false;
    }
    console.log('Database connection verified');
    return true;
  } catch (err) {
    console.error('Database error:', err.message);
    return false;
  }
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
  const supabase = getSupabase();
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
  const supabase = getSupabase();
  if (!supabase || !email) return;
  try {
    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email)
      .maybeSingle();
    if (!existing) {
      await supabase.from('profiles').insert({
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

export async function createBookingRecords(phoneNumber, bookingData, pricing) {
  const supabase = getSupabase();
  if (!supabase) {
    console.error('Database not initialized — returning fallback tracking number');
    return { trackingNumber: generateTrackingNumber(), receiptNumber: null };
  }

  const trackingNumber = generateTrackingNumber();
  const timestamp = Date.now();
  const receiptNumber = generateReceiptNumber(timestamp);
  const transactionId = generateTransactionId(timestamp);

  const isOtherItemsOnly =
    bookingData.includeBoxes && !bookingData.includeDrums && !bookingData.includeTrunks;

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
    boxes: bookingData.includeBoxes ? { description: bookingData.boxesDescription } : null,
    addOns: {
      metalSeal: !!bookingData.wantMetalSeal,
      metalSealPrice: pricing.sealUnit,
    },
  };

  const notes = [];
  if (bookingData.wantMetalSeal) notes.push('Metal Coded Seal requested');
  if (bookingData.paymentMethod === 'cashOnCollection') notes.push('Cash payment (discount applied)');
  if (bookingData.includeBoxes) notes.push(`Other Items (agent quote): ${bookingData.boxesDescription}`);
  if (bookingData.includeTrunks && bookingData.trunkQuantity > 0) {
    notes.push(`${bookingData.trunkQuantity} x Trunk/Storage Box`);
  }
  if (bookingData.deliveryNote) notes.push(`Delivery note: ${bookingData.deliveryNote}`);

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
    deliveryNote: bookingData.deliveryNote || null,
    bookingSource: 'whatsapp-bot-ireland',
    whatsappNumber: phoneNumber,
    createdAt: new Date(timestamp).toISOString(),
  };

  const collectionScheduleId = await findCollectionScheduleId(
    bookingData.collectionRoute,
    bookingData.collectionDate,
  );

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
  }

  const fullName = `${bookingData.senderFirstName || ''} ${bookingData.senderLastName || ''}`.trim();
  await ensureProfileFor(bookingData.senderEmail, fullName, shipmentRow.id);

  console.log('Booking created:', trackingNumber, '/', receiptNumber);
  return { trackingNumber, receiptNumber };
}

export async function getShipmentByTracking(trackingNumber) {
  const supabase = getSupabase();
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

export async function getCollectionSchedules() {
  const supabase = getSupabase();
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from('collection_schedules')
      .select('route, pickup_date')
      .eq('country', COUNTRY)
      .order('route');
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('Failed to get collection schedules:', err.message);
    return [];
  }
}

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { randomBytes } from 'node:crypto';
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

function referenceBase(firstName, lastName, phone, shipmentDate) {
  const letters = `${firstName || ''}${lastName || ''}`.replace(/[^a-z]/gi, '').toUpperCase();
  const prefix = (letters || 'CUS').slice(0, 3).padEnd(3, 'X');
  const phoneDigits = String(phone || '').replace(/\D/g, '');
  const phoneTail = phoneDigits.slice(-4).padStart(4, '0');
  const parsed = new Date(shipmentDate);
  const date = Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  return `${prefix}-${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getFullYear()).slice(-2)}-${phoneTail}`;
}

async function generateCustomerReference(bookingData) {
  const base = referenceBase(bookingData.senderFirstName, bookingData.senderLastName, bookingData.senderPhone, bookingData.collectionDate);
  if (!supabase) return base;
  const { data } = await supabase.from('shipments').select('customer_reference').like('customer_reference', `${base}%`);
  const count = data?.length || 0;
  return count === 0 ? base : `${base}-${String(count + 1).padStart(2, '0')}`;
}

export async function createCustomerRequest({ shipmentId = null, customerName = null, whatsappNumber, requestType, message = null, customerReference = null }) {
  if (!supabase || !whatsappNumber) return null;
  const { data, error } = await supabase.from('customer_requests').insert({
    shipment_id: shipmentId,
    customer_name: customerName,
    whatsapp_number: whatsappNumber,
    request_type: requestType,
    message,
    customer_reference: customerReference,
    status: 'New',
    unread: true,
    source: 'whatsapp-bot',
  }).select().single();
  if (error) {
    console.warn('Customer request could not be saved:', error.message);
    return null;
  }
  return data;
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
  const customerReference = await generateCustomerReference(bookingData);
  const qrToken = randomBytes(24).toString('base64url');

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
    customerReference,
    qrToken,
    deliveryNote: { status: 'Draft', number: `DN-${customerReference}` },
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
      customer_reference: customerReference,
      qr_token: qrToken,
      collection_status: 'Awaiting Collection',
      delivery_note_status: 'Draft',
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

  await createCustomerRequest({
    shipmentId: shipmentRow.id,
    customerName: fullName,
    whatsappNumber: phoneNumber,
    requestType: isOtherItemsOnly ? 'Custom Quote' : 'New Booking',
    message: isOtherItemsOnly
      ? bookingData.boxesDescription
      : `${bookingData.drumQuantity || 0} drum(s), ${bookingData.trunkQuantity || 0} trunk(s)`,
    customerReference,
  });

  console.log('✅ Booking created:', trackingNumber, '/', receiptNumber);
  return { trackingNumber, receiptNumber, customerReference, qrToken, shipmentId: shipmentRow.id };
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

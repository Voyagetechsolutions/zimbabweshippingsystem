import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { CURRENCY, COUNTRY } from '../utils/pricingUtils.js';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY,
);

export { supabase };

export async function initializeDatabase() {
  try {
    const { error } = await supabase.from('shipments').select('count').limit(1);
    if (error) {
      console.error('Database connection error:', error);
      throw error;
    }
    console.log('✅ Database connection initialized');
    return true;
  } catch (error) {
    console.error('Failed to initialize database:', error);
    throw error;
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

export async function getPickupDateForRoute(route) {
  if (!route) return null;
  try {
    // Route codes here are uppercase (e.g. 'LONDON'); DB stores e.g. 'London Route'.
    const { data } = await supabase
      .from('collection_schedules')
      .select('route, pickup_date')
      .eq('country', COUNTRY)
      .ilike('route', `%${route}%`)
      .limit(1);
    const row = data?.[0];
    if (row?.pickup_date && row.pickup_date !== 'Not set') return row.pickup_date;
  } catch (err) {
    console.error('Error fetching pickup date for route:', err?.message || err);
  }
  return null;
}

async function findCollectionScheduleId(route, date) {
  if (!route || !date) return null;
  try {
    const { data } = await supabase
      .from('collection_schedules')
      .select('id')
      .ilike('route', `%${route}%`)
      .eq('pickup_date', date)
      .maybeSingle();
    return data?.id || null;
  } catch {
    return null;
  }
}

async function ensureProfileFor(email, fullName, profileIdFallback) {
  if (!email) return;
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
  const trackingNumber = generateTrackingNumber();
  const timestamp = Date.now();
  const receiptNumber = generateReceiptNumber(timestamp);
  const transactionId = generateTransactionId(timestamp);

  const isOtherItemsOnly = bookingData.includeBoxes && !bookingData.includeDrums;

  const sender = {
    firstName: bookingData.senderFirstName,
    lastName: bookingData.senderLastName,
    email: bookingData.senderEmail,
    phone: bookingData.senderPhone,
    phone2: bookingData.senderPhone2 || null,
    address: bookingData.senderAddress,
    city: bookingData.senderCity,
    postcode: bookingData.senderPostcode || null,
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
    trunks: null, // UK bot does not offer trunks
    boxes: bookingData.includeBoxes
      ? { description: bookingData.boxesDescription }
      : null,
    addOns: {
      metalSeal: !!bookingData.wantMetalSeal,
      metalSealPrice: pricing.sealUnit,
    },
    purchasedDrums: bookingData.purchaseDrums && bookingData.purchaseDrumType
      ? {
          type: bookingData.purchaseDrumType,
          quantity: pricing.purchaseDrumQty,
          priceEach: pricing.purchaseDrumUnit,
          totalPrice: pricing.purchaseDrumTotal,
        }
      : null,
  };

  const notes = [];
  if (bookingData.wantMetalSeal) notes.push('Metal Coded Seal requested');
  if (bookingData.paymentMethod === 'cashOnCollection') notes.push('Cash payment on collection');
  if (bookingData.includeBoxes) notes.push(`Other Items (agent quote): ${bookingData.boxesDescription}`);
  if (bookingData.purchaseDrums && bookingData.purchaseDrumType && bookingData.purchaseDrumQuantity > 0) {
    const label = bookingData.purchaseDrumType === 'metal' ? 'Metal Drum (£40)' : 'Plastic Barrel (£50)';
    notes.push(`Purchase ${bookingData.purchaseDrumQuantity} x ${label}`);
  }

  const types = [];
  if (bookingData.includeDrums) types.push('Drums');
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
      includeTrunks: false,
      trunkQuantity: 0,
      includeOtherItems: !!bookingData.includeBoxes,
      wantMetalSeal: !!bookingData.wantMetalSeal,
      category: bookingData.boxesDescription || null,
    },
    notes: notes.length ? notes.join(' | ') : null,
    bookingSource: 'whatsapp-bot-uk',
    whatsappNumber: phoneNumber,
    createdAt: new Date(timestamp).toISOString(),
  };

  const collectionScheduleId = await findCollectionScheduleId(
    bookingData.collectionRoute,
    bookingData.collectionDate,
  );

  // 1. shipments
  const originLabel = bookingData.collectionRoute
    ? `${bookingData.collectionRoute.charAt(0)}${bookingData.collectionRoute.slice(1).toLowerCase()} Route, ${COUNTRY}`
    : `${bookingData.senderCity}, ${COUNTRY}`;

  const { data: shipmentRow, error: shipmentErr } = await supabase
    .from('shipments')
    .insert({
      tracking_number: trackingNumber,
      user_id: null,
      origin: originLabel,
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
        pickupAddress: `${bookingData.senderAddress}, ${bookingData.senderCity}, ${bookingData.senderPostcode || ''}`.trim(),
        deliveryAddress: `${bookingData.receiverAddress}, ${bookingData.receiverCity}, Zimbabwe`,
        route: bookingData.collectionRoute || null,
        collectionDate: bookingData.collectionDate || null,
      },
      payment_schedule: null,
    });

  if (receiptErr) {
    console.error('Error creating receipt:', receiptErr);
    // Non-fatal — booking still succeeded.
  }

  // 4. profile (best-effort)
  const fullName = `${bookingData.senderFirstName || ''} ${bookingData.senderLastName || ''}`.trim();
  await ensureProfileFor(bookingData.senderEmail, fullName, shipmentRow.id);

  console.log('✅ Booking created:', trackingNumber, '/', receiptNumber);
  return { trackingNumber, receiptNumber };
}

export async function getShipmentByTracking(trackingNumber) {
  try {
    const { data, error } = await supabase
      .from('shipments')
      .select('*')
      .eq('tracking_number', trackingNumber)
      .single();
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching shipment:', error);
    return null;
  }
}

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

let supabase = null;

export function initializeDatabase() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
    console.warn('⚠️  Supabase credentials not found. Database features will be limited.');
    return;
  }

  supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
  );

  console.log('✅ Database connection initialized');
}

export async function createShipment(phoneNumber, bookingData) {
  if (!supabase) {
    console.error('Database not initialized');
    return generateTrackingNumber();
  }

  const trackingNumber = generateTrackingNumber();
  
  const shipmentData = {
    tracking_number: trackingNumber,
    status: 'Pending Collection',
    origin: `${bookingData.senderCity}, Ireland`,
    destination: `${bookingData.receiverCity}, Zimbabwe`,
    user_id: null,
    metadata: {
      sender: {
        name: bookingData.senderName,
        email: bookingData.senderEmail,
        phone: bookingData.senderPhone,
        address: bookingData.senderAddress,
        city: bookingData.senderCity,
        eircode: bookingData.senderEircode,
        country: 'Ireland'
      },
      recipient: {
        name: bookingData.receiverName,
        phone: bookingData.receiverPhone,
        address: bookingData.receiverAddress,
        city: bookingData.receiverCity,
        country: 'Zimbabwe'
      },
      shipment: {
        drums: bookingData.drums || 0,
        boxes: bookingData.boxes || 0,
        metalSeal: bookingData.metalSeal || false,
        doorToDoor: bookingData.doorToDoor || false,
        collectionRoute: bookingData.collectionRoute
      },
      payment: {
        method: bookingData.paymentMethod,
        currency: 'EUR'
      },
      bookingType: 'whatsapp',
      whatsappNumber: phoneNumber,
      createdAt: new Date().toISOString()
    }
  };

  try {
    const { data, error } = await supabase
      .from('shipments')
      .insert(shipmentData)
      .select()
      .single();

    if (error) {
      console.error('Error creating shipment:', error);
      return trackingNumber;
    }

    console.log('✅ Shipment created:', trackingNumber);
    return trackingNumber;
  } catch (error) {
    console.error('Database error:', error);
    return trackingNumber;
  }
}

export async function getShipmentByTracking(trackingNumber) {
  if (!supabase) {
    console.error('Database not initialized');
    return null;
  }

  try {
    const { data, error } = await supabase
      .from('shipments')
      .select('*')
      .eq('tracking_number', trackingNumber)
      .single();

    if (error) {
      console.error('Error fetching shipment:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Database error:', error);
    return null;
  }
}

export async function updateShipmentStatus(trackingNumber, status) {
  if (!supabase) {
    console.error('Database not initialized');
    return false;
  }

  try {
    const { error } = await supabase
      .from('shipments')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('tracking_number', trackingNumber);

    if (error) {
      console.error('Error updating shipment:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Database error:', error);
    return false;
  }
}

export async function getShipmentsByPhone(phoneNumber) {
  if (!supabase) {
    console.error('Database not initialized');
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('shipments')
      .select('*')
      .contains('metadata', { whatsappNumber: phoneNumber })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching shipments:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Database error:', error);
    return [];
  }
}

function generateTrackingNumber() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = 'ZS-';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

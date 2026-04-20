import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export async function initializeDatabase() {
  try {
    // Test connection
    const { data, error } = await supabase.from('shipments').select('count').limit(1);
    
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

export async function createShipment(phoneNumber, bookingData) {
  try {
    const trackingNumber = generateTrackingNumber();
    
    const shipmentData = {
      tracking_number: trackingNumber,
      status: 'Pending Collection',
      origin: `${bookingData.senderCity}, UK`,
      destination: `${bookingData.receiverCity}, Zimbabwe`,
      user_id: null,
      metadata: {
        sender: {
          name: bookingData.senderName,
          phone: bookingData.senderPhone,
          email: bookingData.senderEmail,
          address: bookingData.senderAddress,
          city: bookingData.senderCity,
          postcode: bookingData.senderPostcode,
          country: 'England',
          collectionRoute: bookingData.collectionRoute
        },
        recipient: {
          name: bookingData.receiverName,
          phone: bookingData.receiverPhone,
          address: bookingData.receiverAddress,
          city: bookingData.receiverCity
        },
        shipment: {
          drums: bookingData.drums || 0,
          boxes: bookingData.boxes || 0,
          metalSeal: bookingData.metalSeal || false,
          doorToDoor: bookingData.doorToDoor || false
        },
        payment: {
          method: bookingData.paymentMethod,
          status: 'Pending'
        },
        bookingSource: 'whatsapp-bot-uk',
        whatsappNumber: phoneNumber,
        createdAt: new Date().toISOString()
      }
    };

    const { data, error } = await supabase
      .from('shipments')
      .insert(shipmentData)
      .select()
      .single();

    if (error) {
      console.error('Error creating shipment:', error);
      throw error;
    }

    console.log('✅ Shipment created:', trackingNumber);
    return trackingNumber;
  } catch (error) {
    console.error('Failed to create shipment:', error);
    throw error;
  }
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

function generateTrackingNumber() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = 'ZS-';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export { supabase };

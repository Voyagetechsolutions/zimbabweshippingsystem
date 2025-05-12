
import { supabase } from '@/integrations/supabase/client';
import { v4 as uuidv4 } from 'uuid';

export interface ShipmentData {
  senderDetails: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    additionalPhone?: string;
    country: string;
    address: string;
    city: string;
    postcode: string;
  };
  recipientDetails: {
    name: string;
    phone: string;
    additionalPhone?: string;
    address: string;
    city: string;
  };
  shipmentDetails: {
    includeDrums: boolean;
    includeOtherItems: boolean;
    type: string;
    quantity?: number;
    weight?: string;
    dimensions?: string;
    category?: string;
    specificItem?: string;
    description?: string;
  };
  collectionDetails: {
    route: string;
    date: string;
  };
  services: {
    doorToDoor: boolean;
    metalSeal: boolean;
    additionalAddresses?: string[];
  };
  payment: {
    option: string;
    method: string;
    basePrice: number;
  };
}

// Generate a unique tracking number
export const generateTrackingNumber = (): string => {
  // Format: ZIMSHIP-XXXXX (where X is a random digit)
  return `ZIMSHIP-${Math.floor(10000 + Math.random() * 90000)}`;
};

// Create a new shipment record in Supabase
export const createShipment = async (data: ShipmentData): Promise<{ shipmentId: string; trackingNumber: string; error?: any }> => {
  try {
    const trackingNumber = generateTrackingNumber();
    const shipmentId = uuidv4();
    
    // Get authenticated user if available
    const { data: { user } } = await supabase.auth.getUser();
    
    const shipment = {
      id: shipmentId,
      tracking_number: trackingNumber,
      status: 'Booking Confirmed', // Changed from 'pending' to 'Booking Confirmed'
      origin: `${data.senderDetails.address}, ${data.senderDetails.city}, ${data.senderDetails.postcode}, ${data.senderDetails.country}`,
      destination: `${data.recipientDetails.address}, ${data.recipientDetails.city}, Zimbabwe`,
      user_id: user?.id || null,
      metadata: {
        sender: data.senderDetails,
        recipient: data.recipientDetails,
        shipment: data.shipmentDetails,
        collection: data.collectionDetails,
        services: data.services,
        payment: data.payment
      }
    };
    
    const { data: shipmentData, error } = await supabase
      .from('shipments')
      .insert(shipment)
      .select()
      .single();
    
    if (error) throw error;
    
    return {
      shipmentId: shipmentData.id,
      trackingNumber: shipmentData.tracking_number
    };
  } catch (error) {
    console.error('Error creating shipment:', error);
    return {
      shipmentId: '',
      trackingNumber: '',
      error
    };
  }
};

// Get a shipment by ID
export const getShipmentById = async (shipmentId: string) => {
  try {
    const { data, error } = await supabase
      .from('shipments')
      .select('*')
      .eq('id', shipmentId)
      .single();
    
    if (error) throw error;
    
    return { data, error: null };
  } catch (error) {
    console.error('Error fetching shipment:', error);
    return { data: null, error };
  }
};

// Update a shipment's status
export const updateShipmentStatus = async (shipmentId: string, status: string) => {
  try {
    const { data, error } = await supabase
      .from('shipments')
      .update({ status })
      .eq('id', shipmentId)
      .select()
      .single();
    
    if (error) throw error;
    
    return { success: true, data };
  } catch (error) {
    console.error('Error updating shipment status:', error);
    return { success: false, error };
  }
};

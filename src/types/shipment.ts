
import { Json } from '@/integrations/supabase/types';

export interface ShipmentProfile {
  email?: string;
  full_name?: string;
}

// Interface to properly type the metadata field
export interface ShipmentMetadata {
  [key: string]: any; // Add index signature to allow for dynamic properties like 'delivery_image'
  // Add specific properties that we know will exist
  doorToDoor?: boolean;
  amountPaid?: number;
  pickupCountry?: string;
  shipmentType?: string;
}

export interface Shipment {
  id: string;
  tracking_number: string;
  origin: string;
  destination: string;
  status: string;
  created_at: string;
  updated_at: string;
  user_id?: string;
  can_cancel?: boolean;
  can_modify?: boolean;
  carrier?: string | null;
  dimensions?: string | null;
  estimated_delivery?: string | null;
  metadata?: ShipmentMetadata | Json | null;
  weight?: number | null;
  // Add the profiles property that we attach after fetching
  profiles?: ShipmentProfile;
}

// Helper function to cast data to Shipment type
export function castToShipment(data: any): Shipment {
  return {
    id: data.id,
    tracking_number: data.tracking_number,
    origin: data.origin,
    destination: data.destination,
    status: data.status,
    created_at: data.created_at,
    updated_at: data.updated_at,
    user_id: data.user_id,
    can_cancel: data.can_cancel ?? true,
    can_modify: data.can_modify ?? true,
    carrier: data.carrier || null,
    dimensions: data.dimensions || null,
    estimated_delivery: data.estimated_delivery || null,
    metadata: data.metadata || null,
    weight: data.weight || null,
    profiles: data.profiles
  };
}

// Helper function to cast array of data to Shipment[] type
export function castToShipments(data: any[]): Shipment[] {
  return data.map(item => castToShipment(item));
}

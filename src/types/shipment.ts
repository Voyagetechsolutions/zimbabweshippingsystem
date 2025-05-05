
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
  estimatedDelivery?: string;
  carrier?: string;
  weight?: number;
  dimensions?: string;
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
  carrier?: string;
  dimensions?: string;
  estimated_delivery?: string;
  metadata?: ShipmentMetadata | Json;
  weight?: number;
  // Add the profiles property that we attach after fetching
  profiles?: ShipmentProfile;
}

// Helper function to cast Json to ShipmentMetadata
export const castToShipmentMetadata = (metadata: Json | null): ShipmentMetadata => {
  if (!metadata) return {};
  if (Array.isArray(metadata)) return {};
  return metadata as ShipmentMetadata;
};

// Helper function to safely cast a shipment with proper metadata typing
export const castToShipment = (shipment: any): Shipment => {
  if (!shipment) return {} as Shipment;
  
  return {
    ...shipment,
    metadata: castToShipmentMetadata(shipment.metadata),
    // Extract metadata properties to the top level if they exist
    carrier: shipment.carrier || (shipment.metadata && typeof shipment.metadata === 'object' && !Array.isArray(shipment.metadata)) 
      ? shipment.metadata.carrier : undefined,
    dimensions: shipment.dimensions || (shipment.metadata && typeof shipment.metadata === 'object' && !Array.isArray(shipment.metadata)) 
      ? shipment.metadata.dimensions : undefined,
    estimated_delivery: shipment.estimated_delivery || (shipment.metadata && typeof shipment.metadata === 'object' && !Array.isArray(shipment.metadata)) 
      ? shipment.metadata.estimatedDelivery : undefined,
    weight: shipment.weight || (shipment.metadata && typeof shipment.metadata === 'object' && !Array.isArray(shipment.metadata)) 
      ? shipment.metadata.weight : undefined,
  };
};

// Helper function to safely cast an array of shipments with proper metadata typing
export const castToShipments = (shipments: any[]): Shipment[] => {
  if (!shipments || !Array.isArray(shipments)) return [];
  
  return shipments.map(shipment => castToShipment(shipment));
};


import { Json } from '@/integrations/supabase/types';

export interface ShipmentProfile {
  email?: string;
  full_name?: string;
}

// Interface to properly type the metadata field
export interface ShipmentMetadata {
  [key: string]: any; // Add index signature to allow for dynamic properties
  // Add specific properties that we know will exist
  doorToDoor?: boolean;
  amountPaid?: number;
  pickupCountry?: string;
  shipmentType?: string;
  includeDrums?: boolean;
  includeOtherItems?: boolean;
  wantMetalSeal?: boolean;
  additionalDeliveryAddresses?: any[];
  basePrice?: number;
  sealCost?: number;
  doorToDoorCost?: number;
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

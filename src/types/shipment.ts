
import { Json } from '@/integrations/supabase/types';

export interface ShipmentProfile {
  email?: string;
  full_name?: string;
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
  metadata?: Json;
  weight?: number;
  // Add the profiles property that we attach after fetching
  profiles?: ShipmentProfile;
}

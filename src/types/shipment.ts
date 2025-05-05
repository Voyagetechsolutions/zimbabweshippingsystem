
export interface Shipment {
  id: string;
  tracking_number: string;
  status: string;
  origin: string;
  destination: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  metadata: any;
  can_cancel: boolean;
  can_modify: boolean;
  // Note: These fields might not exist in the database but are required by the type
  // so we mark them as optional to prevent errors
  carrier?: string;
  weight?: number | string;
  dimensions?: string;
  estimated_delivery?: string;
  // Add profiles for joined queries
  profiles?: {
    email?: string;
    full_name?: string;
  };
}

export interface ShipmentExport {
  id: string;
  tracking_number: string;
  status: string;
  origin: string;
  destination: string;
  created_at: string;
  user_id: string;
  metadata: any;
}

export interface ShipmentFilters {
  status?: string;
  fromDate?: Date;
  toDate?: Date;
  search?: string;
}


export interface Shipment {
  id: string;
  tracking_number: string;
  status: string;
  origin: string;
  destination: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  metadata: ShipmentMetadata;
  can_cancel: boolean;
  can_modify: boolean;
  // Additional optional fields
  carrier?: string;
  weight?: number | string;
  dimensions?: string;
  estimated_delivery?: string;
  // Add profiles property for user data
  profiles?: {
    email?: string | null;
    full_name?: string | null;
  };
}

export interface ShipmentMetadata {
  sender?: SenderDetails;
  senderDetails?: SenderDetails;
  recipient?: RecipientDetails;
  recipientDetails?: RecipientDetails;
  shipment?: ShipmentDetails;
  shipmentDetails?: ShipmentDetails;
  collection?: CollectionDetails;
  delivery?: DeliveryDetails;
  // Any other fields that might be present
  [key: string]: any;
}

export interface SenderDetails {
  firstName?: string;
  lastName?: string;
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  additionalPhone?: string;
  postcode?: string;
  [key: string]: any;
}

export interface RecipientDetails {
  firstName?: string;
  lastName?: string;
  name?: string;
  phone?: string;
  address?: string;
  additionalPhone?: string;
  city?: string;
  [key: string]: any;
}

export interface ShipmentDetails {
  type?: string;
  quantity?: string | number;
  category?: string;
  description?: string;
  includeDrums?: boolean;
  includeOtherItems?: boolean;
  wantMetalSeal?: boolean;
  doorToDoor?: boolean;
  specificItem?: string;
  services?: Array<{ name: string; price: string | number }>;
  additionalAddresses?: string[];
  [key: string]: any;
}

export interface CollectionDetails {
  route?: string;
  date?: string;
  scheduled?: boolean;
  completed?: boolean;
  notes?: string;
  [key: string]: any;
}

export interface DeliveryDetails {
  driver_id?: string;
  driver_name?: string;
  date?: string;
  assigned_at?: string;
  completed_at?: string;
  isLate?: boolean;
  notes?: string;
  [key: string]: any;
}

export interface ShipmentExport {
  id: string;
  tracking_number: string;
  status: string;
  origin: string;
  destination: string;
  created_at: string;
  user_id: string;
  metadata: ShipmentMetadata;
}

export interface ShipmentFilters {
  status?: string;
  fromDate?: Date;
  toDate?: Date;
  search?: string;
}


import { Json } from "@/integrations/supabase/types";

export interface Receipt {
  id: string;
  user_id: string | null;
  shipment_id: string | null;
  payment_id?: string;
  receipt_number?: string;
  amount?: number;
  currency?: string;
  payment_method?: string;
  status?: string;
  created_at: string;
  updated_at: string;
  sender_details: Json | SenderDetails;
  recipient_details: Json | RecipientDetails;
  shipment_details: Json | ShipmentDetails;
  collection_info: Json | CollectionInfo;
  payment_info: Json | PaymentInfo;
}

export interface SenderDetails {
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  [key: string]: any;
}

export interface RecipientDetails {
  name?: string;
  phone?: string;
  additionalPhone?: string;
  address?: string;
  [key: string]: any;
}

export interface ShipmentDetails {
  tracking_number?: string;
  type?: string;
  quantity?: number;
  description?: string;
  category?: string;
  services?: ShipmentService[];
  metadata?: any;
  [key: string]: any;
}

export interface ShipmentService {
  name: string;
  price?: number;
  [key: string]: any;
}

export interface CollectionInfo {
  pickup_address?: string;
  pickup_postcode?: string;
  pickup_country?: string;
  date?: string;
  area?: string;
  [key: string]: any;
}

export interface PaymentInfo {
  receipt_number?: string;
  amount?: number;
  finalAmount?: number;
  currency?: string;
  method?: string;
  status?: string;
  date?: string;
  payment_id?: string;
  [key: string]: any;
}

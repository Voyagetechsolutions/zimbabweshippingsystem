
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
  sender_details: Json;
  recipient_details: Json;
  shipment_details: Json;
  collection_info: Json;
  payment_info: Json;
}

export interface PaymentInfo {
  receipt_number?: string;
  amount?: number;
  currency?: string;
  method?: string;
  status?: string;
  date?: string;
  payment_id?: string;
  [key: string]: any;
}

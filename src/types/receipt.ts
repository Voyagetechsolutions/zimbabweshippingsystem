
import { Json } from "@/integrations/supabase/types";

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

export interface Receipt {
  id: string;
  created_at: string;
  updated_at: string;
  receipt_number?: string;
  user_id?: string;
  shipment_id?: string;
  amount?: number;
  currency?: string;
  payment_method?: string;
  status?: string;
  payment_id?: string;
  sender_details?: Record<string, any>;
  recipient_details?: Record<string, any>;
  shipment_details?: Record<string, any>;
  collection_info?: Record<string, any>;
  payment_info?: PaymentInfo;
}

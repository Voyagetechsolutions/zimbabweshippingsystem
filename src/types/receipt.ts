
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

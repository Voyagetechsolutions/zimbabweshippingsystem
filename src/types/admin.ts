
import { Json } from "@/integrations/supabase/types";

export interface AuditLog {
  id: string;
  user_id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  details: any | null;
  ip_address: string | null;
  created_at: string;
  user_email?: string;
  user_name?: string;
}

export interface Role {
  id: string;
  name: string;
  permissions: {
    [key: string]: boolean | {
      [action: string]: boolean;
    };
  };
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface SystemSetting {
  id: string;
  key: string;
  value: Json;
  created_at: string;
  updated_at: string;
}

export interface Ticket {
  id: string;
  user_id: string;
  subject: string;
  message: string;
  status: string;
  priority: string;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
  user_email?: string;
  user_name?: string;
}

export interface TicketResponse {
  id: string;
  ticket_id: string;
  user_id: string;
  message: string;
  is_staff_response: boolean;
  created_at: string;
  user_email?: string;
  user_name?: string;
}

// Generic type guard for type casting
export function castTo<T>(data: unknown): T {
  return data as T;
}

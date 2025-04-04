
import { Database } from './types';
import { Json } from './types';

// Add types for the tables created in the SQL migration
export interface Tables {
  addresses: Database['public']['Tables']['addresses']['Row'];
  notifications: Database['public']['Tables']['notifications']['Row'];
  payments: Database['public']['Tables']['payments']['Row'];
  shipments: Database['public']['Tables']['shipments']['Row'];
  profiles: Database['public']['Tables']['profiles']['Row'];
  
  // Add the receipts table
  receipts: {
    id: string;
    shipment_id: string;
    payment_id: string;
    receipt_number: string;
    created_at: string;
    payment_method: string;
    amount: number;
    currency: string;
    sender_details: Json;
    recipient_details: Json;
    shipment_details: Json;
    status: string;
  };
  
  // Add the reviews table we just created
  reviews: {
    id: string;
    user_id: string;
    shipment_id: string | null;
    rating: number;
    comment: string | null;
    created_at: string;
  };
  
  // New tables that aren't in the generated types yet
  audit_logs: {
    id: string;
    user_id: string;
    action: string;
    entity_type: string;
    entity_id: string | null;
    details: Json | null;
    ip_address: string | null;
    created_at: string;
  };
  
  support_tickets: {
    id: string;
    user_id: string;
    subject: string;
    message: string;
    status: string;
    priority: string;
    assigned_to: string | null;
    created_at: string;
    updated_at: string;
  };
  
  ticket_responses: {
    id: string;
    ticket_id: string;
    user_id: string;
    message: string;
    is_staff_response: boolean;
    created_at: string;
  };
  
  system_settings: {
    id: string;
    key: string;
    value: Json;
    created_at: string;
    updated_at: string;
  };
  
  user_roles: {
    id: string;
    name: string;
    permissions: Json;
    description: string | null;
    created_at: string;
    updated_at: string;
  };
  
  user_role_assignments: {
    id: string;
    user_id: string;
    role_id: string;
    assigned_by: string | null;
    created_at: string;
  };
}

// Helper function to cast types safely when using tables not in the generated types
export function tableFrom<T extends keyof Tables>(tableName: T) {
  return tableName;
}

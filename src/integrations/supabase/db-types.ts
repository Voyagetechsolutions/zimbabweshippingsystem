
import { Database } from './types';
import { Json } from './types';

// Add types for the tables created in the SQL migration
export interface Tables {
  addresses: Database['public']['Tables']['addresses']['Row'];
  notifications: Database['public']['Tables']['notifications']['Row'];
  payments: Database['public']['Tables']['payments']['Row'];
  shipments: Database['public']['Tables']['shipments']['Row'];
  profiles: {
    id: string;
    email: string;
    full_name: string | null;
    avatar_url: string | null;
    role: string | null;
    created_at: string;
    updated_at: string;
    is_admin: boolean | null;
    communication_preferences: Json;
    mfa_enabled: boolean;
    mfa_secret: string | null;
    mfa_backup_codes: string[] | null;
  };
  
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
  
  // Add the gallery table we just created
  gallery: {
    id: string;
    src: string;
    alt: string;
    caption: string;
    category: string;
    created_at: string;
    updated_at: string;
  };
  
  // Add the announcements table
  announcements: {
    id: string;
    title: string;
    content: string;
    category: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
    created_by: string;
    expiry_date: string | null;
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
    notification_sent: boolean;
  };
  
  // Add the response_templates table we just created
  response_templates: {
    id: string;
    user_id: string;
    title: string;
    content: string;
    created_at: string;
    updated_at: string;
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
  
  collection_schedules: {
    id: string;
    route: string;
    pickup_date: string;
    areas: string[];
    created_at: string;
    updated_at: string;
  };
  
  // Updated custom_quotes table with new fields
  custom_quotes: {
    id: string;
    user_id: string | null;
    shipment_id: string | null;
    status: string;
    phone_number: string;
    description: string;
    category: string | null;
    specific_item: string | null; // Added specific_item field
    image_urls: string[];
    quoted_amount: number | null;
    admin_notes: string | null;
    sender_details: Json | null;
    recipient_details: Json | null;
    created_at: string;
    updated_at: string;
  };

  // Adding a driver_performance table to track metrics
  driver_performance: {
    id: string;
    driver_id: string;
    total_deliveries: number;
    completed_deliveries: number;
    on_time_deliveries: number;
    rating: number;
    region: string; // UK or Zimbabwe 
    created_at: string;
    updated_at: string;
  };
}

// Helper function to cast types safely when using tables not in the generated types
export function tableFrom<T extends keyof Tables>(tableName: T) {
  return tableName;
}

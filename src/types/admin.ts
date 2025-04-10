
export interface Role {
  id: string;
  name: string;
  description: string | null;
  permissions: Record<string, any>;
  created_at: string;
  updated_at: string;
}

// Audit log interface
export interface AuditLog {
  id: string;
  user_id: string;
  action: string;
  entity_type: string;
  entity_id?: string;
  details?: any;
  ip_address?: string;
  created_at: string;
  user_email?: string;
  user_name?: string;
}

// System setting interface
export interface SystemSetting {
  id: string;
  key: string;
  value: any;
  created_at: string;
  updated_at: string;
}

// Support ticket interface
export interface Ticket {
  id: string;
  user_id: string;
  subject: string;
  message: string;
  status: string;
  priority: string;
  assigned_to?: string;
  created_at: string;
  updated_at: string;
  user_email?: string;
  user_name?: string;
  metadata?: any;
  is_contact_form?: boolean;
}

// Ticket response interface
export interface TicketResponse {
  id: string;
  ticket_id: string;
  user_id: string;
  message: string;
  is_staff_response: boolean;
  created_at: string;
  notification_sent: boolean;
  user_email?: string;
  user_name?: string;
}

// Announcement interface with enhanced fields
export interface Announcement {
  id: string;
  title: string;
  content: string;
  category: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by: string;
  expiry_date: string | null;
  author_name?: string; // For display purposes
  status: 'draft' | 'published' | 'scheduled' | string;
  publish_at: string | null;
  archived: boolean;
  target_roles: string[] | null;
  target_locations: string[] | null;
  is_critical: boolean;
}

// Helper function for typescript casting
export function castTo<T>(data: any): T {
  return data as T;
}

// User role types
export type UserRoleType = 'admin' | 'logistics' | 'driver' | 'support' | 'customer';

// Permission structure
export interface Permissions {
  admin?: boolean;
  shipments?: {
    read?: boolean;
    write?: boolean;
    delete?: boolean;
  };
  users?: {
    read?: boolean;
    write?: boolean;
    delete?: boolean;
  };
  reports?: {
    read?: boolean;
    write?: boolean;
  };
  support?: {
    read?: boolean;
    write?: boolean;
  };
  settings?: {
    read?: boolean;
    write?: boolean;
  };
}

// Updated ShipmentStatus type to match the actual values used in LogisticsDashboard
export type ShipmentStatus = 
  | 'Booked' 
  | 'Paid' 
  | 'Processing' 
  | 'In Transit' 
  | 'Delivered' 
  | 'Cancelled' 
  | string; // Add string for any other status values

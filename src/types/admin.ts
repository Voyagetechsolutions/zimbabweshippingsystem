
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
}

// Ticket response interface
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

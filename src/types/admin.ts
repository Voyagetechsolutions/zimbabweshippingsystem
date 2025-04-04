
export interface Role {
  id: string;
  name: string;
  description: string | null;
  permissions: Record<string, any>;
  created_at: string;
  updated_at: string;
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

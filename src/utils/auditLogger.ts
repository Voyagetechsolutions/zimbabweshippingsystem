
import { supabase } from '@/integrations/supabase/client';
import { castTo } from '@/types/admin';

export interface AuditLogData {
  action: string;
  entity_type: string;
  entity_id?: string;
  details?: any;
}

/**
 * Add an entry to the audit log
 * 
 * @param data Audit log data containing action, entity_type, and optional entity_id and details
 * @returns Promise with the result of the insert operation
 */
export async function addAuditLog(data: AuditLogData) {
  try {
    // Get client IP address if possible
    let ipAddress: string | null = null;
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      ipAddress = data.ip;
    } catch (error) {
      console.error('Failed to get IP address:', error);
    }
    
    // Get current user ID
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }
    
    // Use type assertion with 'as any' to bypass TypeScript checking for Supabase tables
    // that are not in the generated types
    const { error } = await (supabase
      .from('audit_logs' as any)
      .insert({
        user_id: user.id,
        action: data.action,
        entity_type: data.entity_type,
        entity_id: data.entity_id || null,
        details: data.details || null,
        ip_address: ipAddress
      }) as any);
    
    if (error) {
      console.error('Error adding audit log:', error);
      throw error;
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error in addAuditLog:', error);
    return { success: false, error };
  }
}

/**
 * Audit log actions for common operations
 */
export const AuditActions = {
  CREATE: 'CREATE',
  UPDATE: 'UPDATE',
  DELETE: 'DELETE',
  LOGIN: 'LOGIN',
  LOGOUT: 'LOGOUT',
  PERMISSION_CHANGE: 'PERMISSION_CHANGE',
  STATUS_CHANGE: 'STATUS_CHANGE',
  BULK_UPDATE: 'BULK_UPDATE',
  VIEW: 'VIEW',
  EXPORT: 'EXPORT',
  IMPORT: 'IMPORT',
  ASSIGN: 'ASSIGN',
};

/**
 * Audit log entity types
 */
export const AuditEntities = {
  USER: 'USER',
  SHIPMENT: 'SHIPMENT',
  ROLE: 'ROLE',
  PERMISSION: 'PERMISSION',
  SETTING: 'SETTING',
  CONTENT: 'CONTENT',
  SUPPORT_TICKET: 'SUPPORT_TICKET',
};

/**
 * Helper function to create an audit log entry with less code
 * Example: logUserAction('UPDATE', 'USER', userId, { fields: ['email'] });
 * 
 * @param action The action being performed
 * @param entityType The type of entity being acted upon
 * @param entityId Optional ID of the entity
 * @param details Optional additional details about the action
 */
export async function logUserAction(
  action: string,
  entityType: string,
  entityId?: string,
  details?: any
) {
  return addAuditLog({
    action,
    entity_type: entityType,
    entity_id: entityId,
    details
  });
}

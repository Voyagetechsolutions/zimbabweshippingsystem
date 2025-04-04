
export type NotificationType = 
  | 'shipment_update'
  | 'payment' 
  | 'system' 
  | 'task' 
  | 'review';

export type NotificationPriority = 'low' | 'normal' | 'high';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  is_read: boolean;
  created_at: string;
  related_id?: string;
  priority?: NotificationPriority;
  action_url?: string;
  icon?: string;
}

export interface NotificationPreferences {
  email_notifications: boolean;
  push_notifications: boolean;
  sms_notifications: boolean;
  shipment_updates: boolean;
  payment_confirmations: boolean;
  special_offers: boolean;
}

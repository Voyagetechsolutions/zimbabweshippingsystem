
import React, { useState, useEffect } from 'react';
import { Bell, CheckCircle, CreditCard, Truck, AlertCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
  related_id: string | null;
}

const NotificationsPanel = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchNotifications();
    }
  }, [user]);

  const fetchNotifications = async () => {
    try {
      const { data, error } = await (supabase
        .from('notifications' as any)
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false }) as any);

      if (error) throw error;

      if (data) {
        setNotifications(data);
        setUnreadCount(data.filter((n: Notification) => !n.is_read).length);
      }
    } catch (error: any) {
      console.error('Error fetching notifications:', error.message);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      const { error } = await (supabase
        .from('notifications' as any)
        .update({ is_read: true })
        .eq('id', id) as any);

      if (error) throw error;

      // Update local state
      setNotifications(
        notifications.map((notification) =>
          notification.id === id ? { ...notification, is_read: true } : notification
        )
      );
      setUnreadCount(Math.max(unreadCount - 1, 0));
    } catch (error: any) {
      console.error('Error marking notification as read:', error.message);
    }
  };

  const markAllAsRead = async () => {
    try {
      const { error } = await (supabase
        .from('notifications' as any)
        .update({ is_read: true })
        .eq('user_id', user?.id)
        .eq('is_read', false) as any);

      if (error) throw error;

      // Update local state
      setNotifications(
        notifications.map((notification) => ({ ...notification, is_read: true }))
      );
      setUnreadCount(0);
      
      toast({
        title: "All notifications marked as read",
        description: `${unreadCount} notification(s) marked as read`,
      });
    } catch (error: any) {
      console.error('Error marking all notifications as read:', error.message);
      toast({
        title: "Error",
        description: "Failed to mark notifications as read",
        variant: "destructive",
      });
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'shipment_update':
        return <Truck className="h-4 w-4" />;
      case 'payment':
        return <CreditCard className="h-4 w-4" />;
      case 'system':
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" onClick={() => fetchNotifications()}>
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 min-w-4 h-4 flex items-center justify-center text-[10px] px-1 py-0 bg-red-500 rounded-full">
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader className="flex flex-row items-center justify-between">
          <SheetTitle>Notifications</SheetTitle>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Button variant="outline" size="sm" onClick={markAllAsRead}>
                Mark all as read
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}>
              <X className="h-5 w-5" />
            </Button>
          </div>
        </SheetHeader>
        
        <div className="mt-4">
          <ScrollArea className="h-[80vh]">
            {notifications.length > 0 ? (
              <div className="space-y-4 pr-4">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`flex items-start p-3 rounded-md ${
                      !notification.is_read ? 'bg-gray-50 dark:bg-gray-800' : 'bg-transparent'
                    }`}
                  >
                    <div className={`p-2 rounded-full mr-3 ${
                      notification.type === 'shipment_update'
                        ? 'bg-blue-100 text-blue-700'
                        : notification.type === 'payment'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-orange-100 text-orange-700'
                    }`}>
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <div className="font-medium">{notification.title}</div>
                        {!notification.is_read && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => markAsRead(notification.id)}
                            className="h-6 px-2 text-xs"
                          >
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Mark read
                          </Button>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                        {notification.message}
                      </p>
                      <div className="text-xs text-gray-500 mt-1">
                        {format(new Date(notification.created_at), 'MMM d, h:mmaaa')}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Bell className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500">No notifications</p>
              </div>
            )}
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default NotificationsPanel;


import React, { useState, useEffect } from 'react';
import { Bell, CheckCircle, CreditCard, Truck, AlertCircle, X, ExternalLink, Tag, Clock, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { Notification, NotificationType } from '@/types/notifications';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const NotificationsPanel = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<NotificationType | 'all'>('all');
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchNotifications();
    }
  }, [user]);

  const fetchNotifications = async () => {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(30);

      if (error) throw error;

      if (data) {
        setNotifications(data as unknown as Notification[]);
        setUnreadCount(data.filter((n: Notification) => !n.is_read).length);
      }
    } catch (error: any) {
      console.error('Error fetching notifications:', error.message);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', id);

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
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user?.id)
        .eq('is_read', false);

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

  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case 'shipment_update':
        return <Truck className="h-4 w-4" />;
      case 'payment':
        return <CreditCard className="h-4 w-4" />;
      case 'system':
        return <AlertCircle className="h-4 w-4" />;
      case 'task':
        return <Clock className="h-4 w-4" />;
      case 'review':
        return <Star className="h-4 w-4" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  const getNotificationColor = (type: NotificationType) => {
    switch (type) {
      case 'shipment_update':
        return 'bg-blue-100 text-blue-700';
      case 'payment':
        return 'bg-green-100 text-green-700';
      case 'system':
        return 'bg-orange-100 text-orange-700';
      case 'task':
        return 'bg-purple-100 text-purple-700';
      case 'review':
        return 'bg-yellow-100 text-yellow-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const filteredNotifications = activeTab === 'all' 
    ? notifications 
    : notifications.filter(n => n.type === activeTab);

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
          <Tabs defaultValue="all" value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
            <TabsList className="grid grid-cols-6 mb-4">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="shipment_update">Shipments</TabsTrigger>
              <TabsTrigger value="payment">Payments</TabsTrigger>
              <TabsTrigger value="task">Tasks</TabsTrigger>
              <TabsTrigger value="review">Reviews</TabsTrigger>
              <TabsTrigger value="system">System</TabsTrigger>
            </TabsList>
          </Tabs>
          
          <ScrollArea className="h-[68vh]">
            {filteredNotifications.length > 0 ? (
              <div className="space-y-4 pr-4">
                {filteredNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`flex items-start p-3 rounded-md ${
                      !notification.is_read ? 'bg-gray-50 dark:bg-gray-800' : 'bg-transparent'
                    }`}
                  >
                    <div className={`p-2 rounded-full mr-3 ${getNotificationColor(notification.type)}`}>
                      {getNotificationIcon(notification.type as NotificationType)}
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
                      <div className="flex justify-between items-center mt-2">
                        <div className="text-xs text-gray-500">
                          {format(new Date(notification.created_at), 'MMM d, h:mmaaa')}
                        </div>
                        {notification.action_url && (
                          <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" asChild>
                            <Link to={notification.action_url}>
                              View Details
                              <ExternalLink className="ml-1 h-3 w-3" />
                            </Link>
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                <div className="pt-4 pb-2">
                  <Button variant="ghost" asChild className="w-full flex justify-center items-center">
                    <Link to="/notifications" onClick={() => setIsOpen(false)}>
                      <span>View all notifications</span>
                      <ExternalLink className="ml-2 h-3 w-3" />
                    </Link>
                  </Button>
                </div>
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

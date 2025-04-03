
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Bell, CheckCircle, CreditCard, Truck, AlertCircle, Filter } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import WhatsAppButton from '@/components/WhatsAppButton';
import NotificationsPanel from '@/components/NotificationsPanel';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
  related_id: string | null;
}

const Notifications = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [typeFilter, setTypeFilter] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchNotifications();
    }
  }, [user, filter, typeFilter]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      // Apply read/unread filter
      if (filter === 'read') {
        query = query.eq('is_read', true);
      } else if (filter === 'unread') {
        query = query.eq('is_read', false);
      }

      // Apply type filter if selected
      if (typeFilter) {
        query = query.eq('type', typeFilter);
      }

      const { data, error } = await query;

      if (error) throw error;

      if (data) {
        setNotifications(data as unknown as Notification[]);
      }
    } catch (error: any) {
      console.error('Error fetching notifications:', error.message);
      toast({
        title: 'Error',
        description: 'Failed to fetch notifications',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
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
    } catch (error: any) {
      console.error('Error marking notification as read:', error.message);
      toast({
        title: 'Error',
        description: 'Failed to mark notification as read',
        variant: 'destructive'
      });
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
      
      toast({
        title: "Success",
        description: "All notifications marked as read",
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

  const handleNavigateToRelated = (type: string, relatedId: string | null) => {
    if (!relatedId) return;
    
    if (type === 'shipment_update') {
      navigate(`/shipment/${relatedId}`);
    } else if (type === 'payment') {
      navigate('/account'); // Navigate to payment section in account
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'shipment_update':
        return <Truck className="h-5 w-5" />;
      case 'payment':
        return <CreditCard className="h-5 w-5" />;
      case 'system':
        return <AlertCircle className="h-5 w-5" />;
      default:
        return <Bell className="h-5 w-5" />;
    }
  };

  const getNotificationTypeClass = (type: string) => {
    switch (type.toLowerCase()) {
      case 'shipment_update':
        return 'bg-blue-100 text-blue-700';
      case 'payment':
        return 'bg-green-100 text-green-700';
      case 'system':
        return 'bg-orange-100 text-orange-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;
  
  // Get unique notification types for the filter
  const notificationTypes = Array.from(new Set(notifications.map(n => n.type)));

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="absolute top-4 right-20 z-10">
        <NotificationsPanel />
      </div>
      <main className="flex-grow container mx-auto px-4 py-8">
        <Card className="shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="bg-zim-green/10 p-3 mr-3 rounded-full">
                  <Bell className="h-6 w-6 text-zim-green" />
                </div>
                <div>
                  <CardTitle className="text-lg font-bold">Notifications</CardTitle>
                  <CardDescription>
                    Manage your notifications
                    {unreadCount > 0 && ` (${unreadCount} unread)`}
                  </CardDescription>
                </div>
              </div>
              {unreadCount > 0 && (
                <Button variant="outline" onClick={markAllAsRead}>
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Mark all as read
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <div className="flex flex-col sm:flex-row gap-4 justify-between">
                <Tabs defaultValue="all" className="w-full sm:w-auto" onValueChange={(value) => setFilter(value as 'all' | 'unread' | 'read')}>
                  <TabsList>
                    <TabsTrigger value="all">All</TabsTrigger>
                    <TabsTrigger value="unread">Unread</TabsTrigger>
                    <TabsTrigger value="read">Read</TabsTrigger>
                  </TabsList>
                </Tabs>
                
                <div className="flex gap-2">
                  <select 
                    className="px-3 py-2 bg-white border border-gray-300 rounded-md text-sm"
                    onChange={(e) => setTypeFilter(e.target.value || null)}
                    value={typeFilter || ''}
                  >
                    <option value="">All types</option>
                    {notificationTypes.map((type) => (
                      <option key={type} value={type}>{type.replace('_', ' ')}</option>
                    ))}
                  </select>
                  
                  <Button variant="outline" size="icon" onClick={() => {
                    setFilter('all');
                    setTypeFilter(null);
                  }}>
                    <Filter className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            {loading ? (
              <div className="flex justify-center py-10">
                <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-zim-green"></div>
              </div>
            ) : notifications.length > 0 ? (
              <div className="space-y-4">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`flex items-start p-4 rounded-md border ${
                      !notification.is_read ? 'bg-gray-50' : ''
                    }`}
                  >
                    <div
                      className={`p-2 rounded-full mr-3 ${getNotificationTypeClass(notification.type)}`}
                    >
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <div className="font-medium">{notification.title}</div>
                        <div className="text-xs text-gray-500">
                          {format(new Date(notification.created_at), 'MMM d, h:mmaaa')}
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                      <div className="flex items-center mt-2 gap-2">
                        {notification.related_id && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleNavigateToRelated(notification.type, notification.related_id)}
                          >
                            View details
                          </Button>
                        )}
                        {!notification.is_read && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => markAsRead(notification.id)}
                          >
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Mark as read
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-10">
                <Bell className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500">No notifications found</p>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
      <Footer />
      <WhatsAppButton />
    </div>
  );
};

export default Notifications;

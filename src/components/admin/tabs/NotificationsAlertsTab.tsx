
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Bell,
  Mail,
  Settings,
  Trash2,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

// Define types for notification data
interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  created_at: string;
  is_read: boolean;
}

const NotificationsAlertsTab = () => {
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [newShipmentAlerts, setNewShipmentAlerts] = useState(true);
  const [quoteRequestAlerts, setQuoteRequestAlerts] = useState(true);
  const [unpaidInvoiceAlerts, setUnpaidInvoiceAlerts] = useState(true);

  // Simulated data - in a real app, this would come from the database
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // In a real implementation, you would fetch this data from your database
        // For demo purposes, we'll use mock data
        const mockNotifications: Notification[] = [
          {
            id: 'n1',
            title: 'New Shipment',
            message: 'A new shipment (ZIMSHIP-12345) has been created by Alice Moyo',
            type: 'shipment_update',
            created_at: '2025-05-09T10:30:00',
            is_read: false
          },
          {
            id: 'n2',
            title: 'Quote Request',
            message: 'Thomas Ncube has submitted a new quote request for special items',
            type: 'quote_request',
            created_at: '2025-05-08T14:45:00',
            is_read: false
          },
          {
            id: 'n3',
            title: 'Unpaid Invoice',
            message: 'Invoice #INV-2023-0458 for shipment ZIMSHIP-45678 is overdue',
            type: 'payment',
            created_at: '2025-05-07T09:15:00',
            is_read: true
          },
          {
            id: 'n4',
            title: 'Delivery Confirmation',
            message: 'Shipment ZIMSHIP-23456 was delivered successfully to Grace Mutasa',
            type: 'shipment_update',
            created_at: '2025-05-06T16:30:00',
            is_read: true
          }
        ];

        // In production, you'd fetch from Supabase here
        // const { data: notificationsData, error: notificationsError } = await supabase
        //   .from('notifications')
        //   .select('*')
        //   .order('created_at', { ascending: false });
        
        // if (notificationsError) throw notificationsError;
        
        setNotifications(mockNotifications);
      } catch (error) {
        console.error('Error fetching notification data:', error);
        toast({
          title: 'Error',
          description: 'Failed to load notification data',
          variant: 'destructive'
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [toast]);

  const markAsRead = (id: string) => {
    setNotifications(prevNotifications =>
      prevNotifications.map(notification =>
        notification.id === id ? { ...notification, is_read: true } : notification
      )
    );
    toast({
      title: 'Marked as read',
      description: 'The notification has been marked as read',
    });
  };

  const deleteNotification = (id: string) => {
    setNotifications(prevNotifications =>
      prevNotifications.filter(notification => notification.id !== id)
    );
    toast({
      title: 'Notification deleted',
      description: 'The notification has been permanently deleted',
    });
  };

  const saveNotificationSettings = () => {
    toast({
      title: 'Settings saved',
      description: 'Your notification preferences have been updated',
    });
  };

  const filteredNotifications = activeTab === 'all' 
    ? notifications
    : activeTab === 'unread'
      ? notifications.filter(n => !n.is_read)
      : notifications.filter(n => n.type === activeTab);

  return (
    <>
      <Tabs defaultValue={activeTab} value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="all">All Notifications</TabsTrigger>
          <TabsTrigger value="unread">Unread</TabsTrigger>
          <TabsTrigger value="shipment_update">Shipments</TabsTrigger>
          <TabsTrigger value="payment">Payments</TabsTrigger>
          <TabsTrigger value="quote_request">Quotes</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Notification Settings</CardTitle>
              <CardDescription>Configure how and when you receive notifications</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium mb-3">Delivery Methods</h3>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Switch 
                        checked={emailNotifications} 
                        onCheckedChange={setEmailNotifications}
                        id="email-notifications"
                      />
                      <Label htmlFor="email-notifications" className="flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        Email Notifications
                      </Label>
                    </div>
                    <p className="text-sm text-muted-foreground pl-9">
                      Receive important notifications via email
                    </p>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium mb-3">Alert Types</h3>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Switch 
                        checked={newShipmentAlerts} 
                        onCheckedChange={setNewShipmentAlerts}
                        id="new-shipment-alerts"
                      />
                      <Label htmlFor="new-shipment-alerts">New Shipment Alerts</Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Switch 
                        checked={quoteRequestAlerts} 
                        onCheckedChange={setQuoteRequestAlerts}
                        id="quote-request-alerts"
                      />
                      <Label htmlFor="quote-request-alerts">Quote Request Alerts</Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Switch 
                        checked={unpaidInvoiceAlerts} 
                        onCheckedChange={setUnpaidInvoiceAlerts}
                        id="unpaid-invoice-alerts"
                      />
                      <Label htmlFor="unpaid-invoice-alerts">Unpaid Invoice Alerts</Label>
                    </div>
                  </div>
                </div>

                <Button onClick={saveNotificationSettings}>
                  Save Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value={activeTab}>
          {activeTab !== 'settings' && (
            <Card>
              <CardHeader>
                <CardTitle>
                  {activeTab === 'all' ? 'All Notifications' : 
                   activeTab === 'unread' ? 'Unread Notifications' : 
                   activeTab === 'shipment_update' ? 'Shipment Notifications' : 
                   activeTab === 'payment' ? 'Payment Notifications' : 
                   'Quote Request Notifications'}
                </CardTitle>
                <CardDescription>
                  {filteredNotifications.length} notification{filteredNotifications.length !== 1 ? 's' : ''}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex justify-center items-center p-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-zim-green"></div>
                  </div>
                ) : filteredNotifications.length === 0 ? (
                  <div className="text-center p-12">
                    <Bell className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium mb-2">No notifications</h3>
                    <p className="text-gray-500">
                      You're all caught up!
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredNotifications.map((notification) => (
                      <div 
                        key={notification.id}
                        className={`p-4 border rounded-lg ${notification.is_read ? 'bg-white' : 'bg-blue-50'}`}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex items-start gap-3">
                            <div className="mt-1">
                              {notification.type === 'shipment_update' && (
                                <Badge className="bg-blue-100 text-blue-800 border-blue-300">
                                  Shipment
                                </Badge>
                              )}
                              {notification.type === 'payment' && (
                                <Badge className="bg-green-100 text-green-800 border-green-300">
                                  Payment
                                </Badge>
                              )}
                              {notification.type === 'quote_request' && (
                                <Badge className="bg-purple-100 text-purple-800 border-purple-300">
                                  Quote
                                </Badge>
                              )}
                            </div>
                            <div>
                              <h4 className="font-medium">{notification.title}</h4>
                              <p className="text-gray-600 text-sm mt-1">{notification.message}</p>
                              <p className="text-gray-400 text-xs mt-2">
                                {new Date(notification.created_at).toLocaleString()}
                              </p>
                            </div>
                          </div>
                          <div className="flex space-x-1">
                            {!notification.is_read && (
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => markAsRead(notification.id)}
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                            )}
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => deleteNotification(notification.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </>
  );
};

export default NotificationsAlertsTab;

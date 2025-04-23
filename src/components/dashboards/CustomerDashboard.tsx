
import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import CustomerShipments from '@/components/CustomerShipments';
import CustomerTickets from '@/components/CustomerTickets';
import CustomerSettings from '@/components/CustomerSettings';
import CustomerCustomQuotes from '@/components/dashboards/CustomerCustomQuotes';

const CustomerDashboard = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('shipments');
  const [notificationsCount, setNotificationsCount] = useState({
    shipments: 0,
    quotes: 0,
    tickets: 0
  });
  
  useEffect(() => {
    const fetchNotificationsCount = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) return;
        
        const { data: notifications, error } = await supabase
          .from('notifications')
          .select('type, is_read')
          .eq('user_id', user.id)
          .eq('is_read', false);
        
        if (error) throw error;
        
        if (notifications) {
          // Count unread notifications by type
          const counts = {
            shipments: 0,
            quotes: 0,
            tickets: 0
          };
          
          notifications.forEach(notif => {
            if (notif.type === 'shipment_update' || notif.type === 'delivery') {
              counts.shipments++;
            } else if (notif.type === 'quote_response') {
              counts.quotes++;
            } else if (notif.type === 'ticket_response') {
              counts.tickets++;
            }
          });
          
          setNotificationsCount(counts);
        }
      } catch (error) {
        console.error('Error fetching notifications count:', error);
      }
    };
    
    fetchNotificationsCount();
    
    // Set up real-time subscription for notifications
    const channel = supabase
      .channel('public:notifications')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications'
      }, () => {
        fetchNotificationsCount();
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'notifications'
      }, () => {
        fetchNotificationsCount();
      })
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);
  
  return (
    <Tabs defaultValue="shipments" value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="grid grid-cols-4 mb-8">
        <TabsTrigger value="shipments" className="relative">
          Shipments
          {notificationsCount.shipments > 0 && (
            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
              {notificationsCount.shipments}
            </span>
          )}
        </TabsTrigger>
        <TabsTrigger value="quotes" className="relative">
          Custom Quotes
          {notificationsCount.quotes > 0 && (
            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
              {notificationsCount.quotes}
            </span>
          )}
        </TabsTrigger>
        <TabsTrigger value="support" className="relative">
          Support
          {notificationsCount.tickets > 0 && (
            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
              {notificationsCount.tickets}
            </span>
          )}
        </TabsTrigger>
        <TabsTrigger value="settings">
          Settings
        </TabsTrigger>
      </TabsList>
      
      <TabsContent value="shipments">
        <CustomerShipments />
      </TabsContent>
      
      <TabsContent value="quotes">
        <CustomerCustomQuotes />
      </TabsContent>
      
      <TabsContent value="support">
        <CustomerTickets />
      </TabsContent>
      
      <TabsContent value="settings">
        <CustomerSettings />
      </TabsContent>
    </Tabs>
  );
};

export default CustomerDashboard;
